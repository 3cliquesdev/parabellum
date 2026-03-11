

# Auditoria Completa: Caminhos de Saída do Nó AI

## Bugs Encontrados

### BUG CRÍTICO 1 — Strict RAG fall-through (linhas 4328-4400)

O `if (flow_context)` na linha 4328 loga que vai ignorar o handoff, mas **não tem `return` nem `else`**. A execução cai direto nas linhas 4339+ que executam o handoff completo: `ai_mode = 'waiting_human'`, `route-conversation`, finaliza flow state, envia mensagem de handoff via WhatsApp.

**Fix:** Adicionar `return` ou envolver o handoff em `else`.

### BUG CRÍTICO 2 — Fallback fall-through (linhas 8005-8153)

O `if (flow_context)` na linha 8009 limpa as fallback phrases e seta `isFallbackResponse = false`, mas **não tem `return`**. A execução cai na linha 8063+ que executa o handoff completo (waiting_human, route, etc.). Setar `isFallbackResponse = false` não ajuda porque já estamos dentro do `if (isFallbackResponse)` externo.

**Fix:** Adicionar `return` no final do bloco `if (flow_context)` (após linha 8060), retornando a resposta limpa como sucesso.

### BUG 3 — Confidence handoff still returns flow_advance_needed (linhas 5015-5041)

Quando `customerRequestedHuman && flow_context`, o código retorna `flow_advance_needed`. Pela regra "IA nunca sai do nó de entrada", isso deveria ser bloqueado — exceto se o cliente pediu humano explicitamente (exit keyword).

**Decisão:** Este é CORRETO se `customerRequestedHuman` = exit keyword explícita. Manter como está.

### BUG 4 — Restriction violation retorna flow_advance_needed (linhas 8330-8361)

Quando a IA viola restrições (forbid_questions, forbid_options), retorna `flow_advance_needed`. Deveria limpar a resposta e ficar no nó.

**Fix:** Em vez de retornar `flow_advance_needed`, substituir a mensagem pelo fallback, persistir, e continuar execução.

### BUG 5 — Contract violation retorna flowExit (linhas 8289-8321)

Quando a IA fabrica transferência (escape attempt), retorna `contractViolation: true, flowExit: true`. O process-chat-flow re-invoca com `forceAIExit: true` → e aí retorna `flow_advance_needed` (linhas 8262-8288).

**Fix:** Em vez de retornar `contractViolation/flowExit`, substituir a mensagem por resposta genérica e continuar. Manter o log de auditoria.

### BUG 6 — Trava financeira força waiting_human (linhas 8362-8376)

Quando `forbidFinancial` está ativo e a IA tenta resolver assunto financeiro, o código seta `ai_mode = 'waiting_human'` diretamente. Este é intencional (trava de segurança configurada), **manter como está**.

## Resumo de Saídas Legítimas vs Bugs

```text
SAÍDA                    | STATUS     | AÇÃO
─────────────────────────┼────────────┼──────────────
Strict RAG fall-through  | 🔴 BUG    | Adicionar else/return
Fallback fall-through    | 🔴 BUG    | Adicionar return
Restriction violation    | 🔴 BUG    | Substituir e ficar
Contract violation       | 🔴 BUG    | Substituir e ficar  
[[FLOW_EXIT]] limpo      | ✅ OK     | Exit keyword legítima
customerRequestedHuman   | ✅ OK     | Pedido explícito
Trava financeira         | ✅ OK     | Segurança configurada
forceAIExit              | ⚠️ REVISAR | Só deveria disparar por exit keyword
```

## Mudanças

### 1. Strict RAG — adicionar `else` (linhas 4336-4339)
Envolver o bloco de handoff (linhas 4338-4430) em `else { ... }` para que não execute quando `flow_context` existe.

### 2. Fallback — adicionar `return` (após linha 8060)
Após limpar as fallback phrases e persistir, retornar `Response` com `status: 'sent'` e a mensagem limpa.

### 3. Restriction violation — substituir e ficar (linhas 8330-8361)
Em vez de retornar `flow_advance_needed`, substituir `assistantMessage` pelo fallback, logar, e deixar a execução continuar (remover o `return`).

### 4. Contract violation — substituir e ficar (linhas 8289-8321)
Em vez de retornar `contractViolation/flowExit`, substituir `assistantMessage` por resposta genérica ("Poderia me dar mais detalhes?"), logar, e continuar execução.

### Arquivo
- `supabase/functions/ai-autopilot-chat/index.ts` — 4 correções cirúrgicas

### Resultado
A IA **permanece no nó** em todos os cenários exceto: exit keyword explícita (`[[FLOW_EXIT]]`), pedido humano explícito do cliente, e trava financeira configurada.

