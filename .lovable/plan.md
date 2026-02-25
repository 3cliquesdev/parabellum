

# Plano: Redirecionar para Consultor após Verificação de Email

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Problema

Quando um lead fornece o email e o sistema encontra o cadastro, o código atual (linha 2693-2762 de `ai-autopilot-chat/index.ts`) **sempre** mostra o menu genérico "1-Pedidos, 2-Sistema" — mesmo que o cliente encontrado tenha um `consultant_id` definido.

O comportamento correto (que funcionava antes via o fluxo de transferência) é: se o cliente tem consultor, redirecionar direto para ele em modo `copilot`, sem mostrar menu.

## Causa Raiz

Dois pontos falhando:

1. **`verify-customer-email`** não retorna o `consultant_id` do cliente encontrado — o campo não é consultado no SELECT.
2. **`ai-autopilot-chat`** (bloco de email encontrado, ~linha 2693) não verifica se o cliente tem consultor antes de montar a resposta com menu.

## Solução

### 1. `verify-customer-email/index.ts` — Incluir `consultant_id` no retorno

- Adicionar `consultant_id` ao SELECT (linha 37)
- Incluir `consultant_id` no objeto de resposta JSON

### 2. `ai-autopilot-chat/index.ts` — Verificar consultor antes de mostrar menu

No bloco `if (verifyResult.found)` (~linha 2693), **antes** de montar o menu:

```text
Email encontrado?
    │
    ├── Cliente tem consultant_id?
    │   ├── SIM → Atribuir conversa ao consultor (copilot)
    │   │         Enviar mensagem: "Encontrei seu cadastro! Vou te conectar com seu consultor."
    │   │         Chamar route-conversation
    │   │         RETURN (sem menu)
    │   │
    │   └── NÃO → Mostrar menu "1-Pedidos / 2-Sistema" (comportamento atual)
    │
```

Lógica específica quando `consultant_id` existe:
- UPDATE `conversations` → `assigned_to = consultant_id`, `ai_mode = 'copilot'`
- Persistir `consultant_id` no contato do lead (se diferente)
- Chamar `route-conversation` para enfileirar distribuição
- Enviar mensagem personalizada (sem menu)
- Registrar nota de auditoria em `interactions`

## Impacto

| Regra | Status |
|---|---|
| Kill Switch respeitado | Sim — não envia via IA, só atribui |
| Fluxo não quebra | Sim — return early antes do menu |
| Conversas já atribuídas | Não afetadas — só atua em `assigned_to IS NULL` |
| ROUTING-LOCK | Não alterado |
| TRANSFER-PERSIST-LOCK | Não alterado |
| Auditoria | Sim — log em `interactions` |

## Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/verify-customer-email/index.ts` | Adicionar `consultant_id` ao SELECT e retorno |
| `supabase/functions/ai-autopilot-chat/index.ts` | Verificar `consultant_id` no bloco de email encontrado (~linha 2693) e redirecionar se existir |

