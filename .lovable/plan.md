

# Auditoria Completa — Todos os Nós do Fluxo

## Resultado: 98% OK — 2 bugs encontrados

---

## Inventário: 16 tipos de nó

| # | Tipo | UI (Node) | Editor (Panel) | Sidebar (Drag) | Engine (process-chat-flow) | Status |
|---|---|---|---|---|---|---|
| 1 | `input` (start) | Nó nativo ReactFlow | — | Criado automaticamente | ✅ Auto-traverse | OK |
| 2 | `message` | MessageNode | ✅ | ✅ | ✅ Auto-advance loop (L3210) | OK |
| 3 | `ask_name` | AskNameNode | ✅ | ✅ | ✅ Validação name (L1949) | OK |
| 4 | `ask_email` | AskEmailNode | ✅ | ✅ | ✅ Validação email (L1950) | OK |
| 5 | `ask_phone` | AskPhoneNode | ✅ | ✅ | ✅ Validação phone (L1951) | OK |
| 6 | `ask_cpf` | AskCpfNode | ✅ | ✅ | ✅ Validação cpf (L1952) | OK |
| 7 | `ask_options` | AskOptionsNode | ✅ | ✅ | ✅ matchAskOption + multi-handle (L1982) | OK |
| 8 | `ask_text` | AskTextNode | ✅ | ✅ | ✅ Validação text genérica | OK |
| 9 | `condition` | ConditionNode | ✅ | ✅ | ✅ evaluateConditionPath (L2025) | OK |
| 10 | `condition_v2` | ConditionV2Node | ✅ | ✅ | ✅ evaluateConditionV2Path (L2034) | OK |
| 11 | `ai_response` | AIResponseNode | ✅ 6 handles | ✅ BehaviorControls | ✅ Modo persistente + 6 intents (L2039) | OK |
| 12 | `transfer` | TransferNode | ✅ | ✅ | ✅ Dept/Agent/Consultant/Preferred (L3072) | OK |
| 13 | `end` | EndNode | ✅ | ✅ | ✅ Complete + end_actions (L2971) | OK |
| 14 | `fetch_order` | FetchOrderNode | ✅ | ✅ | ✅ Auto-traverse (L2764) | OK |
| 15 | `validate_customer` | ValidateCustomerNode | ✅ | ✅ | ✅ Silencioso + auto-traverse (L2817) | OK |
| 16 | `verify_customer_otp` | VerifyCustomerOTPNode | ✅ | ✅ | ✅ Máquina de estados OTP (L1519) | OK |
| 17 | `create_ticket` | CreateTicketNode | ✅ | ✅ | ✅ Mid-flow + EndNode action (L3211) | OK |

---

## BUG 1: Trigger traversal ignora `condition_v2`

**Arquivo:** `process-chat-flow/index.ts`, linha 4053

O loop de traversal para fluxos recém-disparados (trigger) só reconhece `input` e `condition`:
```typescript
while (... && (trigCurrentNode.type === 'input' || trigCurrentNode.type === 'condition'))
```

Se um fluxo começar com `start → condition_v2`, o motor **para** no `condition_v2` achando que é um nó de conteúdo, e tenta entregar como mensagem — causando erro silencioso.

**Correção:** Adicionar `condition_v2` ao check:
```typescript
while (... && (trigCurrentNode.type === 'input' || trigCurrentNode.type === 'condition' || trigCurrentNode.type === 'condition_v2'))
```
E dentro do loop, tratar `condition_v2` com `evaluateConditionV2Path`.

---

## BUG 2: Auto-advance de messages não trata `condition_v2`

**Arquivo:** `process-chat-flow/index.ts`, linha 3247

No loop de auto-avanço após nós `message`/`create_ticket`, apenas `condition` é avaliada:
```typescript
if (afterMessage.type === 'condition') { ... }
```

Se o caminho for `message → condition_v2 → ask_name`, o `condition_v2` não é avaliado e o nó é tratado como destino final, fazendo o fluxo parar prematuramente.

**Correção:** Estender o `if` para incluir `condition_v2`:
```typescript
if (afterMessage.type === 'condition' || afterMessage.type === 'condition_v2') {
  const condPath = afterMessage.type === 'condition_v2'
    ? evaluateConditionV2Path(afterMessage.data, collectedData, userMessage, undefined, activeContactData, activeConversationData, flowDef.edges || [])
    : evaluateConditionPath(afterMessage.data, collectedData, userMessage, undefined, activeContactData, activeConversationData);
  const afterCond = findNextNode(flowDef, afterMessage, condPath);
  nextNode = afterCond || null;
}
```

---

## Verificações OK (sem issues)

- **findNextNode**: Hierarquia de fallback `path → ai_exit → default → any` funciona para todos os 6 handles do AI node
- **Consultor fallback**: `consultant_id` verificado → sem consultor redireciona para suporte
- **Desambiguação**: Todas as 5 intenções (financeiro, cancelamento, comercial, suporte, consultor) têm prompts obrigatórios
- **Handoff forçado**: Quando exit sem `nextNode`, handoff automático com busca de departamento (L2573)
- **Auto-traverse pós validate_customer/fetch_order/OTP**: Todos cobrem `condition_v2` corretamente
- **EndNode actions**: `create_ticket`, `create_lead`, `add_tag` configuráveis
- **Status semântico**: `waiting_input` para ask_*, condition, condition_v2, verify_customer_otp — consistente em todos os pontos

---

## Plano de Correção (2 edits, 1 arquivo)

**Arquivo:** `supabase/functions/process-chat-flow/index.ts`

1. **Linha 4053**: Adicionar `condition_v2` ao trigger traversal loop + handler dedicado
2. **Linha 3247**: Estender auto-advance para tratar `condition_v2` com `evaluateConditionV2Path`

