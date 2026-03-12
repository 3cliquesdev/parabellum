

# Bug: Nó `condition` bloqueia "sim" — Validação de texto aplicada incorretamente

## Problema Principal

O log mostra claramente:
```
Processing node: type=condition id=1772133662928 msg="" collectedKeys=[]
Validation failed: type=text node=1772133662928 error="Por favor, informe uma resposta" input=""
```

**Bug na linha 1947-1968**: O bloco de validação aplica validação de **texto** (`text validator`) em TODOS os tipos de nó, incluindo `condition`, `condition_v2`, `ask_options` e `ai_response`. O validador de texto rejeita strings vazias (`value.trim().length > 0`), e como a mensagem chega vazia para o nó condition, a resposta é bloqueada com "Por favor, informe uma resposta" — o fluxo nunca avança.

A validação deveria rodar **apenas** para nós `ask_*` (ask_name, ask_email, ask_phone, ask_cpf, ask_text).

## Bug Secundário (L1663)

No auto-traverse do OTP (verify_customer_otp), nós `condition_v2` usam `evaluateConditionPath` (V1) em vez de `evaluateConditionV2Path`:

```typescript
// L1662-1663 — ERRADO
if (resolvedNode.type === 'condition' || resolvedNode.type === 'condition_v2') {
  const condPath = evaluateConditionPath(...); // ❌ Usa V1 para V2
```

## Correções

### Edit 1 — L1955: Restringir validação a nós ask_* apenas

```typescript
// DE:
if (currentNode.data?.validate !== false && validators[validationType]) {

// PARA:
const shouldValidate = ['ask_name', 'ask_email', 'ask_phone', 'ask_cpf', 'ask_text'].includes(currentNode.type);
if (shouldValidate && currentNode.data?.validate !== false && validators[validationType]) {
```

### Edit 2 — L1662-1663: Usar evaluator correto no OTP auto-traverse

```typescript
// DE:
if (resolvedNode.type === 'condition' || resolvedNode.type === 'condition_v2') {
  const condPath = evaluateConditionPath(resolvedNode.data, collectedData, userMessage, undefined, activeContactData, activeConversationData);

// PARA:
if (resolvedNode.type === 'condition' || resolvedNode.type === 'condition_v2') {
  const condPath = resolvedNode.type === 'condition_v2'
    ? evaluateConditionV2Path(resolvedNode.data, collectedData, userMessage, undefined, activeContactData, activeConversationData, flowDef.edges || [])
    : evaluateConditionPath(resolvedNode.data, collectedData, userMessage, undefined, activeContactData, activeConversationData);
```

### Deploy

Redeploy `process-chat-flow` após os 2 edits.

## Impacto

O Bug 1 afeta **qualquer** nó `condition` ou `condition_v2` que receba uma mensagem vazia (cenários de auto-traverse, re-invocações, etc.), fazendo o fluxo travar com "Por favor, informe uma resposta" em vez de avaliar a condição normalmente.

