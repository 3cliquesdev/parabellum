

# Auditoria v5: Bugs Remanescentes no process-chat-flow

Após reler as 5147 linhas com todos os 24 fixes anteriores, encontrei **3 bugs** restantes — todos do tipo "referência de variável errada" introduzidos nos fixes P e Q, mais um bug de inicialização faltante.

---

## Bug R: `contactData` indefinido nos fixes P e Q — ReferenceError

**Local**: L1824, L1839-1840 (Bug P) e L2014, L2029-2030 (Bug Q)

**Impacto**: Os fixes P e Q (OTP not_customer → end e OTP success → end) usam `contactData?.id` para `contactId` nos handlers de `create_ticket` e `add_tag`. Porém, no escopo do active flow (L1554+), a variável correta é `activeContactData` (declarada em L1576). `contactData` só existe no escopo do Master Flow (L4399+). Em Deno strict mode, isso causa `ReferenceError` silencioso que impede a criação de tickets e tags.

**Fix**: Substituir `contactData` por `activeContactData` nas 4 ocorrências:
- L1824: `contactId: contactData?.id` → `contactId: activeContactData?.id`
- L1839: `else if (contactData?.id)` → `else if (activeContactData?.id)`
- L1840: `contact_id: contactData.id` → `contact_id: activeContactData.id`
- L2014: `contactId: contactData?.id` → `contactId: activeContactData?.id`
- L2029: `else if (contactData?.id)` → `else if (activeContactData?.id)`
- L2030: `contact_id: contactData.id` → `contact_id: activeContactData.id`

---

## Bug S: OTP success → ai_response NÃO inicializa `__ai` nem atualiza status

**Local**: L2045-2053

**Impacto**: Quando OTP verifica com sucesso e o próximo nó é `ai_response`, o motor retorna `aiNodeActive: true` mas NÃO:
1. Inicializa `collectedData.__ai = { interaction_count: 0 }` — sem isso, o anti-loop counter começa com lixo
2. Atualiza status para `active` — permanece no status anterior (`waiting_input`)
3. Atualiza `current_node_id` para o nó AI — permanece no nó OTP

Compare com o handler principal de ai_response (L3767-3778) que faz os 3 corretamente.

**Fix**: Adicionar inicialização `__ai`, update do state com `status: 'active'` e `current_node_id`, e passar os campos de controle (allowedSources, persona, forbid*, etc.) antes do return.

---

## Bug T: OTP not_customer → ai_response NÃO inicializa `__ai` nem atualiza status

**Local**: L1855-1863

**Impacto**: Mesmo problema do Bug S, mas no path not_customer. Quando o resolvedNode é `ai_response`, retorna `useAI: resolvedNode.type === 'ai_response'` mas sem `aiNodeActive: true`, sem `__ai` initialization, sem update de `current_node_id/status`.

**Fix**: Adicionar o mesmo tratamento do Bug S — inicializar `__ai`, atualizar state, e retornar `aiNodeActive: true` com campos de controle.

---

## Resumo

| Bug | Local | Tipo | Impacto |
|-----|-------|------|---------|
| R | OTP P/Q end_actions L1824,1839,2014,2029 | ReferenceError | Tickets/tags silenciosamente falham |
| S | OTP success → ai_response L2045 | Inicialização | AI counter incorreto, status errado |
| T | OTP not_customer → ai_response L1855 | Inicialização | AI não ativa corretamente |

## Arquivo

- `supabase/functions/process-chat-flow/index.ts` — 3 edições (Bug R: 6 substituições, Bug S: 1 bloco expandido, Bug T: 1 bloco expandido)

