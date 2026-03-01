
# Variáveis de Contato + Autocomplete + Warnings + Condition Expandido — ✅ IMPLEMENTADO

## Status: COMPLETO

### Backend (`process-chat-flow/index.ts`) ✅
- `buildVariablesContext()` — merge collectedData + contact_* + conversation_* (inclui queue)
- `getVar()` — resolver unificado com fallback chain + .trim() + aliases
- Select expandido em 3 pontos (active flow, manual trigger, master flow)
- `variablesContext` usado em todos os `replaceVariables()` calls
- `evaluateCondition()` atualizada para aceitar contactData/conversationData

### Frontend (`variableCatalog.ts`) ✅ NOVO
- `getAvailableVariables()` com traversal backwards via `getAncestorNodeIds()`
- `findOrphanVariables()` — detecta variáveis não definidas
- Catálogo fixo: CONTACT_VARS, CONVERSATION_VARS, ORDER_VARS
- Campos de condição expandidos: CONDITION_CONTACT_FIELDS (11), CONDITION_CONVERSATION_FIELDS (5)

### Frontend (`VariableAutocomplete.tsx`) ✅ NOVO
- Detecta `{{` e abre dropdown com variáveis filtráveis
- Grupos: Fluxo, Contato, Conversa, Pedido
- Inserção no cursor com `selectionStart/selectionEnd`
- Warning de variáveis órfãs inline

### Frontend (`ChatFlowEditor.tsx`) ✅
- Campos de mensagem usam `VariableAutocomplete`
- Condition selector expandido: 11 campos contato + 5 campos conversa
- `.trim()` no `condition_field` ao salvar
- Flow vars coletadas via graph backwards (não array linear)
