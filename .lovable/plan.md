

# Fix: `financialIntentPattern is not defined` crashing AI response node

## Root Cause

Line 2256 in `process-chat-flow/index.ts` references `financialIntentPattern` in a diagnostic log, but this variable was renamed to `financialPositive` in a previous refactor (line 2091). The crash happens in the "STAY" branch of the ai_response node when `forbid_financial=true` but the message is NOT financial — which is the exact case for "Quero falar sobre meus pedidos".

The `ReferenceError` kills the entire edge function response, so the webhook never gets `aiNodeActive: true` back, and the conversation goes silent.

## Fix

**File:** `supabase/functions/process-chat-flow/index.ts`

**Line 2256:** Replace `financialIntentPattern` with `financialPositive` in the diagnostic log.

```typescript
// FROM:
regexTest=${financialIntentPattern.test(userMessage || '')}

// TO:
regexTest=${financialPositive.test(userMessage || '')}
```

Single line change. This restores the diagnostic logging without crashing the function.

