

# Auditoria: Bugs Encontrados na Lógica de Desambiguação Financeira

## Resultado da Auditoria

### ✅ CORRETO — Regex e Patterns
- `financialAmbiguousPattern` inclui "sacar" em ambos os arquivos (autopilot L1510, process-chat-flow L3124)
- `financialActionPattern` e `financialInfoPattern` sincronizados
- `isFinancialAmbiguous` corretamente exige `!isFinancialAction && !isFinancialInfo`

### ✅ CORRETO — OTP Skip para Ambíguos
- Guard `flow_context.forbidFinancial` no bloco OTP (L5989) funciona
- Bloco OTP (L6034) tem guard `if (!flow_context?.forbidFinancial || isWithdrawalActionClear)` que impede OTP para termos ambíguos

### ✅ CORRETO — Instrução de Desambiguação no Prompt
- `ambiguousFinancialDetected` (L1517) é referenciada dentro do `financialGuardInstruction` (L6338-6344)
- Instrução inclui `[[FLOW_EXIT:financeiro]]` para quando cliente confirmar ação

### ✅ CORRETO — Parser de `[[FLOW_EXIT:intent]]`
- `ESCAPE_PATTERNS` (L1392): `/\[\[FLOW_EXIT(:[a-zA-Z_]+)?\]\]/i` — OK
- `isCleanExit` (L8626): mesma regex — OK
- Extração do intent (L8630-8631) e inclusão na response (L8655) — OK
- `FALLBACK_STRIP_PATTERNS` (L8391): mesma regex — OK

### 🔴 BUG CRÍTICO — `ai_exit_intent` NÃO é propagado para `process-chat-flow`

**O problema:** Dois dos três caminhos de re-invocação enviam `ai_exit_intent` como campo **top-level** no body, mas `process-chat-flow` espera `intentData: { ai_exit_intent }`.

| Arquivo | Linha | Envia | Esperado |
|---|---|---|---|
| `meta-whatsapp-webhook` | L1640 | `{ ai_exit_intent: '...' }` | `{ intentData: { ai_exit_intent: '...' } }` |
| `handle-whatsapp-event` | L1370 | `{ ai_exit_intent: '...' }` | `{ intentData: { ai_exit_intent: '...' } }` |
| `meta-whatsapp-webhook` | L1818 | `{ intentData: { ai_exit_intent } }` | ✅ Correto |

**Impacto:** Quando a IA retorna `[[FLOW_EXIT:financeiro]]` após desambiguação, o intent é extraído corretamente pelo autopilot, enviado para o webhook, mas **perdido** na re-invocação do `process-chat-flow`. O motor não sabe qual saída usar e faz fallback para `default` em vez de `financeiro`.

## Plano de Correção

### Fix 1 — `meta-whatsapp-webhook/index.ts` (linha 1640)
Mudar de:
```
...(autopilotData?.ai_exit_intent ? { ai_exit_intent: autopilotData.ai_exit_intent } : {})
```
Para:
```
...(autopilotData?.ai_exit_intent ? { intentData: { ai_exit_intent: autopilotData.ai_exit_intent } } : {})
```

### Fix 2 — `handle-whatsapp-event/index.ts` (linha 1370)
Mudar de:
```
...(aiResponse.ai_exit_intent ? { ai_exit_intent: aiResponse.ai_exit_intent } : {})
```
Para:
```
...(aiResponse.ai_exit_intent ? { intentData: { ai_exit_intent: aiResponse.ai_exit_intent } } : {})
```

### Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/meta-whatsapp-webhook/index.ts` | Wrapping `ai_exit_intent` em `intentData` (L1640) |
| `supabase/functions/handle-whatsapp-event/index.ts` | Wrapping `ai_exit_intent` em `intentData` (L1370) |

Apenas 2 linhas de código mudam. Sem risco de regressão.

