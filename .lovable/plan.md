

# BUG CRITICO: IA Fora do Ar — Field Name Mismatch

## Diagnóstico

A IA não responde porque o Master Flow nunca é acionado para novas conversas.

**Root cause**: Os webhooks de WhatsApp (Meta e Evolution API) enviam `customerMessage` ao `process-chat-flow`, mas essa função espera `userMessage`. O campo chega como `undefined`, fazendo o motor retornar "No message to check triggers" → AUTO-DECISION seta `waiting_human` → IA nunca é chamada.

Evidência nos logs:
```
[process-chat-flow] Processing: { conversationId: "f59791fb...", userMessage: undefined }
[meta-whatsapp-webhook] Flow response: {"useAI":true,"reason":"No message to check triggers"}
[AUTO-DECISION] No active flow → waiting_human (fallback)
```

O `process-buffered-messages` envia corretamente `userMessage` (linha 482), mas como a conversa já foi marcada `waiting_human` pelo webhook, o buffer nunca a processa.

## Correção

### 1. `supabase/functions/process-chat-flow/index.ts` (linha 776)
Adicionar alias para aceitar ambos os campos:
```typescript
const { conversationId, flowId, manualTrigger, ... } = body;
const userMessage = body.userMessage || body.customerMessage; // ← alias
```

Isso é a correção mais segura: corrige o bug sem precisar alterar os ~15 call sites nos dois webhooks. Mantém retrocompatibilidade.

### 2. Validação — Garantir que `handle-whatsapp-event` também está coberto
A mesma correção no `process-chat-flow` resolve ambos os webhooks automaticamente, já que o alias aceita `customerMessage`.

### Impacto
- Novas conversas WhatsApp (Meta e Evolution) voltam a acionar o Master Flow
- IA volta a responder em modo autopilot
- Zero breaking changes (o campo `userMessage` continua funcionando para o buffer)

