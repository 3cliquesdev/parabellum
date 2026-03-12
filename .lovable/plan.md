

# Auditoria Completa: process-chat-flow — Bugs e Gaps por Nó

## Resumo da Auditoria

Analisei todos os 13 tipos de nó e suas 5 zonas de execução (Manual Trigger, Active State, Auto-Traverse, Master Flow, Trigger Match). Encontrei **9 bugs concretos** que podem causar travamentos, mensagens não entregues ou inconsistências de estado.

---

## Bug 1: Transfer node NÃO define `completed_at` (caminho principal)

**Arquivo**: `process-chat-flow/index.ts` ~L3307-3315
**Impacto**: O cron `cleanup-stuck-flow-states` pode marcar esses flows como "stuck" e resetá-los, causando comportamento imprevisível.
**Todos os outros paths de transfer** definem `completed_at`. Este é o único que não define.

**Fix**: Adicionar `completed_at: new Date().toISOString()` ao update na L3307-3315.

---

## Bug 2: OTP `wait_code` max_attempts usa avaliador ERRADO para condition_v2

**Arquivo**: `process-chat-flow/index.ts` ~L1946-1948
**Impacto**: Quando o OTP falha por max tentativas e o próximo nó é `condition_v2`, o motor usa `evaluateConditionPath` (V1) ao invés de `evaluateConditionV2Path` (V2). Isso pode rotear para o caminho errado.
**Contexto**: O path de OTP verificado com sucesso (L1853-1873) usa os avaliadores corretos para ambos os tipos. O path de falha não.

**Fix**: Replicar a mesma lógica de auto-traverse do path de sucesso (com switch condition/condition_v2).

---

## Bug 3: `ask_*` genérico → `fetch_order` não executa inline

**Arquivo**: `process-chat-flow/index.ts` ~L2074-2171
**Impacto**: Se um nó `ask_text` (ex: "Digite o número do pedido") conecta a um `fetch_order`, o motor NÃO executa a busca. Cai no handler default (L2165) que tenta retornar `message` do fetch_order (que é vazio), efetivamente travando o fluxo.
**O handler de fetch_order SÓ existe** no auto-traverse principal (L2956) e no Master Flow (não cobre ask_* genérico).

**Fix**: Adicionar handler de `fetch_order` inline no bloco ask_* genérico (L2092), similar ao handler de `validate_customer` que já existe ali (L2094-2141).

---

## Bug 4: `ask_*` genérico → `verify_customer_otp` não envia mensagem inicial

**Arquivo**: `process-chat-flow/index.ts` ~L2144-2167
**Impacto**: Se um nó `ask_email` conecta a `verify_customer_otp`, o status é setado corretamente para `waiting_input`, mas a mensagem de "informe seu email" do OTP NÃO é enviada ao usuário. O estado fica em `__otp_step = undefined` (não inicializado).
**O handler de OTP no auto-traverse principal** (L3144-3165) inicializa `__otp_step` e envia a mensagem. O genérico não.

**Fix**: Adicionar handler dedicado para `verify_customer_otp` no bloco ask_* genérico: inicializar `__otp_step = 'ask_email'`, `__otp_attempts = 0`, e retornar a mensagem configurada.

---

## Bug 5: `ai_response` re-entry não atualiza `status` no DB

**Arquivo**: `process-chat-flow/index.ts` ~L3356-3367
**Impacto**: Quando o fluxo transiciona de um ask_* para um novo `ai_response`, o update no DB seta `collected_data` e `current_node_id` mas NÃO atualiza `status`. Se o estado anterior era `waiting_input`, permanece assim. O cron pode considerar como inativo e cancelar.

**Fix**: Adicionar `status: 'active'` ao update na L3360-3367 (já feito no handler genérico L2161).

---

## Bug 6: Transfer após `ask_*` genérico NÃO chama `transition-conversation-state`

**Arquivo**: `process-chat-flow/index.ts` ~L2154-2157
**Impacto**: A transferência retorna `transfer: true` mas NÃO chama a Edge Function centralizada. O webhook precisa interpretar isso e fazer a transição, mas isso depende da implementação do webhook. Todos os OUTROS paths de transfer (L3317-3340, L3594-3617, L2808-2825) usam a função centralizada.

**Fix**: Adicionar chamada a `transition-conversation-state` no handler de transfer do bloco genérico, replicando o padrão dos outros paths.

---

## Bug 7: End node após `ask_*` genérico ignora end_actions

**Arquivo**: `process-chat-flow/index.ts` ~L2148-2152
**Impacto**: Se o fluxo termina após um ask_* com end_action `create_ticket` ou `add_tag`, a ação NÃO é executada. O handler só retorna a mensagem de fim. Os outros paths de end (L3185-3254, L3486-3521) processam as ações.

**Fix**: Replicar a lógica de `end_action` (create_ticket e add_tag) no handler de end do bloco genérico.

---

## Bug 8: Auto-advance de `message` não processa `validate_customer` nem `fetch_order`

**Arquivo**: `process-chat-flow/index.ts` ~L3408
**Impacto**: O while loop de auto-avanço só trata `message` e `create_ticket`. Se um `message` conecta a `validate_customer` ou `fetch_order`, o loop para e o estado fica nesse nó sem executá-lo.

**Fix**: Incluir `validate_customer` e `fetch_order` como nós "passáveis" no loop de auto-avanço, executando suas ações inline (similar ao que já é feito nos auto-traverse de condition).

---

## Bug 9: `ask_*` genérico → `message` não faz auto-avanço

**Arquivo**: `process-chat-flow/index.ts` ~L2164-2167
**Impacto**: Se ask_name → message → ask_email, o motor para no `message` e retorna sua mensagem, mas NÃO avança para o ask_email. O estado fica no nó `message` que não coleta input, efetivamente travando.
**O caminho principal** (L3403-3458) tem um loop de auto-avanço para nós message. O genérico não.

**Fix**: Adicionar loop de auto-avanço de `message` no handler genérico, similar ao do caminho principal.

---

## Nós SEM bugs encontrados

| Nó | Status |
|---|---|
| `start` / `input` | ✅ Auto-traversed corretamente em todas as 5 zonas |
| `condition` (clássico) | ✅ Avaliação true/false com cascata de handles |
| `condition_v2` | ✅ Sim/Não por regra com fallback |
| `ask_options` | ✅ Validação estrita + re-envio de opções |
| `validate_customer` | ✅ Inline em todas as 5 zonas |
| `ai_response` (STAY) | ✅ Persistente com anti-duplicação e intent detection |

---

## Plano de Implementação

### Fase 1 — Fixes críticos (travamentos)
1. Bug 3: fetch_order inline no ask_* genérico
2. Bug 4: verify_customer_otp inicialização no ask_* genérico
3. Bug 9: Auto-avanço de message no ask_* genérico
4. Bug 8: validate_customer/fetch_order no loop de auto-avanço de message

### Fase 2 — Fixes de consistência
5. Bug 1: completed_at no transfer principal
6. Bug 5: status 'active' no ai_response re-entry
7. Bug 6: transition-conversation-state no transfer genérico
8. Bug 7: end_actions no end genérico

### Fase 3 — Fix de roteamento
9. Bug 2: Avaliador V2 no OTP max_attempts

### Arquivo editado
- `supabase/functions/process-chat-flow/index.ts` (único arquivo)

