

# Auditoria Final: Desambiguação Financeira

## Resultado

### ✅ CORRETO — 7 pontos verificados

| Ponto | Status |
|---|---|
| `financialAmbiguousPattern` inclui "sacar" (ambos arquivos) | ✅ |
| OTP skip para ambíguos com `forbidFinancial` (L6034 guard) | ✅ |
| Instrução de desambiguação injetada no prompt (L6338-6344) | ✅ |
| Regex `ESCAPE_PATTERNS` reconhece `[[FLOW_EXIT:intent]]` (L1392) | ✅ |
| `isCleanExit` reconhece `[[FLOW_EXIT:intent]]` (L8626) | ✅ |
| Extração do intent + inclusão na response (L8630-8655) | ✅ |
| Webhook wraps `ai_exit_intent` em `intentData` (L1640, L1370) | ✅ |

### 🔴 BUG CRÍTICO — `intentData.ai_exit_intent` NÃO influencia o path de saída

**O problema:** Quando a IA responde com `[[FLOW_EXIT:financeiro]]` após desambiguação, o fluxo é:

```text
1. ai-autopilot-chat detecta [[FLOW_EXIT:financeiro]]
   → retorna { flowExit: true, ai_exit_intent: 'financeiro' }

2. Webhook recebe flowExit
   → re-invoca process-chat-flow com:
     { forceAIExit: true, intentData: { ai_exit_intent: 'financeiro' } }

3. process-chat-flow recebe:
   - forceAIExit = true ✅
   - intentData.ai_exit_intent = 'financeiro' ✅
   - Salva em collectedData.ai_exit_intent = 'financeiro' ✅ (L3374)
   
4. MAS: financialIntentMatch = false ❌
   Porque financialIntentMatch depende de:
     (forceFinancialExit && forbidFinancial) → false (é forceAIExit, não forceFinancialExit)
     (forbidFinancial && isFinancialAction)  → false (msg do cliente pode ser "sim")

5. Path selection (L3454-3479):
   financialIntentMatch? false → skip
   ...
   aiExitForced? true → path = 'default' ❌❌❌
```

**Resultado:** A IA desambiguou corretamente, o cliente confirmou, o token `[[FLOW_EXIT:financeiro]]` foi extraído e propagado... mas o `process-chat-flow` ignora o intent e roteia para `default` em vez de `financeiro`.

### Fix

Em `process-chat-flow/index.ts`, **após** salvar `intentData.ai_exit_intent` no `collectedData` (L3374-3377), adicionar lógica para setar os `*IntentMatch` flags baseado no intent recebido:

```typescript
// L3377 (após o bloco existente de intentData)
if (intentData?.ai_exit_intent && !financialIntentMatch && !cancellationIntentMatch && !commercialIntentMatch && !supportIntentMatch && !consultorIntentMatch) {
  const intent = intentData.ai_exit_intent;
  if (intent === 'financeiro') { financialIntentMatch = true; }
  else if (intent === 'cancelamento') { cancellationIntentMatch = true; }
  else if (intent === 'comercial') { commercialIntentMatch = true; }
  else if (intent === 'suporte') { supportIntentMatch = true; }
  else if (intent === 'consultor') { consultorIntentMatch = true; }
  console.log(`[process-chat-flow] 🎯 intentData.ai_exit_intent="${intent}" → *IntentMatch forçado`);
}
```

Isso garante que o intent propagado pelo webhook efetivamente influencia o path de saída do nó AI, completando a cadeia: desambiguação → `[[FLOW_EXIT:financeiro]]` → webhook → `process-chat-flow` → path `financeiro`.

## Arquivo modificado

| Arquivo | Mudança |
|---|---|
| `supabase/functions/process-chat-flow/index.ts` | Após L3377, adicionar mapeamento de `intentData.ai_exit_intent` → `*IntentMatch` flags |

Uma única adição de ~10 linhas. Sem risco de regressão.

