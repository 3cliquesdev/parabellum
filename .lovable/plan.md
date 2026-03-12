

# Auditoria Completa: Sistema de Encerramento de Conversas

## Problemas Encontrados

### 🔴 CRÍTICO 1: Prompt da IA ainda incentiva encerramento por "obrigado"
**Arquivo:** `ai-autopilot-chat/index.ts` L6690
**Problema:** O prompt da tool `close_conversation` ainda diz:
```
"cliente agradece, diz 'era só isso', 'obrigado, resolveu'"
```
Isso contradiz diretamente o fix dos `yesKeywords` — a IA vai continuar chamando `close_conversation` quando o cliente diz "obrigado", mesmo que o detector de confirmação não aceite mais essa palavra. O resultado: IA seta `awaiting_close_confirmation=true` e pergunta "Posso encerrar?" prematuramente.

**Fix:** Reescrever para:
```
close_conversation: Encerre SOMENTE quando o cliente indicar CLARAMENTE que não tem mais dúvidas (ex: "era só isso", "não tenho mais dúvidas", "é isso"). NÃO interprete agradecimentos ("obrigado", "valeu") como sinal de encerramento. SEMPRE pergunte antes (customer_confirmed=false).
```

### 🔴 CRÍTICO 2: Stage 3.5 não invoca `close-conversation` edge function
**Arquivo:** `auto-close-conversations/index.ts` L692-699
**Problema:** O Stage 3.5 faz `update status='closed'` diretamente, sem invocar a edge function `close-conversation`. Todas as outras etapas fazem o mesmo (padrão do arquivo), mas o plano original previa usar `close-conversation` para CSAT, métricas e timeline. Sem isso:
- CSAT não é enviado
- Timeline não é atualizada
- Métricas de fechamento ficam incompletas

**Fix:** Adicionar invocação de `close-conversation` antes do update manual, ou manter consistente com as outras etapas adicionando CSAT inline (como Stage 3a faz).

### 🟡 MÉDIO 3: Mensagem no Stage 3.5 sem flags de bot
**Arquivo:** `auto-close-conversations/index.ts` L675-679
**Problema:** O insert da mensagem não inclui `is_bot_message: true` nem `is_ai_generated: true`:
```typescript
await supabase.from('messages').insert({
  conversation_id: conv.id,
  content: AWAITING_CLOSE_MESSAGE,
  sender_type: 'user',  // sem is_bot_message, sem is_ai_generated
});
```
Nota: as outras etapas do mesmo arquivo também usam apenas `sender_type: 'user'` sem flags extras, então isso é **consistente** com o padrão existente. Manter como está.

### 🟡 MÉDIO 4: `close_reason` não é limpo no metadata (Stage 3.5)
**Arquivo:** `auto-close-conversations/index.ts` L667-669
**Problema:** O destructuring remove `awaiting_close_confirmation` mas não `close_reason`:
```typescript
const { awaiting_close_confirmation, ...cleanMeta } = existingMeta;
```
O `close_reason` fica residual no metadata.

**Fix:** Adicionar `close_reason` ao destructuring:
```typescript
const { awaiting_close_confirmation, close_reason, ...cleanMeta } = existingMeta;
```

### 🟢 OK: yesKeywords
O regex está correto e restritivo. "obrigado", "valeu", etc. foram removidos. Guard de `?` está implementado.

### 🟢 OK: noKeywords
Cobertura adequada de negações e intenção de continuar.

### 🟢 OK: Bypass de skipAutoResponse para awaiting_close_confirmation
O webhook Meta (L755-762) corretamente faz bypass quando `awaiting_close_confirmation=true`.

### 🟢 OK: Tool close_conversation handler (L8194-8221)
Lógica de 2 etapas está correta — seta flag e aguarda confirmação.

### 🟢 OK: Stage 3.5 verifica última mensagem
Corretamente pula se a última mensagem é do contato (cliente respondeu mas não foi processado).

---

## Plano de Correção

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `ai-autopilot-chat/index.ts` L6690 | Reescrever prompt da tool `close_conversation` — remover "obrigado" como trigger |
| 2 | `auto-close-conversations/index.ts` L669 | Adicionar `close_reason` ao destructuring de limpeza do metadata |
| 3 | `auto-close-conversations/index.ts` L692-699 | Decisão: manter consistente com as outras etapas (sem `close-conversation` edge function) — é o padrão do arquivo. Mas adicionar CSAT inline como Stage 3a faz |

Essas 3 correções resolvem os gaps encontrados.

