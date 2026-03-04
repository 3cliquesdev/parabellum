

# Plano: Refinamentos Finais — Regex Non-Greedy + Anti-Loop por Conversation

## 3 ajustes pontuais (2 arquivos)

### 1. `ai-autopilot-chat/index.ts` — Regex non-greedy (linha 1218)

Trocar `.*` por `[\s\S]*?` no pattern de menu textual para evitar match guloso:

```typescript
// De:
/\b1[\)\.\-].*\b2[\)\.\-]/s,
// Para:
/\b1[\)\.\-][\s\S]*?\b2[\)\.\-]/i,
```

### 2. `ai-autopilot-chat/index.ts` — Confirmar payloads limpos

Ambos os retornos (flowExit e contractViolation, linhas 8147-8175) já estão limpos — sem `message`, `response`, `assistantMessage` ou `original_response`. Nenhuma alteração necessária.

### 3. `meta-whatsapp-webhook/index.ts` — Anti-loop por conversationId (linha 297)

Trocar `let flowExitHandled = false` por um `Set<string>` no nível do batch, para suportar múltiplas conversas no mesmo request:

```typescript
// Antes do loop de mensagens (fora do for):
const flowExitHandledByConversation = new Set<string>();

// No check (linha 1528):
if (...&& !flowExitHandledByConversation.has(conversation.id)) {
  flowExitHandledByConversation.add(conversation.id);
```

## Resultado

- Regex mais previsível no runtime Deno
- Payloads confirmados sem vazamento de texto
- Anti-loop robusto para batches multi-conversa

