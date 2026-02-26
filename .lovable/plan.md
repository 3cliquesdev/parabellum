

# Plano: max_interactions avança para próximo nó (não abandona cliente)

Analisei o projeto atual e sigo as regras da base de conhecimento.

## O que muda

Substituir o bloco de `max_interactions` (linhas 1150-1220) em `supabase/functions/process-chat-flow/index.ts` que atualmente:
- Hardcoda `waiting_human`
- Completa o flow state
- Retorna `completed: true` (abandona o cliente)

Pelo comportamento correto:
- Opcionalmente envia `fallback_message` como `sender_type: 'system'`
- Limpa `__ai` do `collectedData`
- **Não** retorna — cai no `findNextNode` (linha 1264) igual ao `exit_keyword`

## Segurança do inbox

A trigger `update_inbox_view_on_message` já ignora `sender_type = 'system'` (migração `20260225183436`), então inserir a fallback_message com `sender_type: 'system'` **não afeta** o filtro "Não respondidas".

## Mudança exata

**Arquivo:** `supabase/functions/process-chat-flow/index.ts`
**Linhas:** 1150-1225

Substituir todo o bloco `if (maxReached && !keywordMatch) { ... }` + o comentário de exit keyword por:

```typescript
          // ✅ UPGRADE: max_interactions deve AVANÇAR para próximo nó
          if (maxReached && !keywordMatch) {
            const fallbackMsg = currentNode.data?.fallback_message;
            if (fallbackMsg && String(fallbackMsg).trim().length > 0) {
              try {
                await supabaseClient.from('messages').insert({
                  conversation_id: conversationId,
                  content: String(fallbackMsg),
                  sender_type: 'system',
                  is_ai_generated: true,
                  is_internal: false,
                  status: 'sent',
                  channel: conversation?.channel || 'web_chat',
                });
                console.log('[process-chat-flow] ✅ fallback_message inserted on max_interactions (will advance)');
              } catch (sendErr) {
                console.error('[process-chat-flow] ⚠️ Failed to insert fallback_message:', sendErr);
              }
            }
            console.log(`[process-chat-flow] 🔄 AI max_interactions reached (${aiCount}/${maxInteractions}) - advancing to next node`);
          }

          // Em ambos os casos (keyword ou max), limpa __ai e deixa o fluxo seguir
          delete collectedData.__ai;
          // Cai no findNextNode normal abaixo (linha 1264)
```

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | ✅ exit_keyword continua igual; anti-duplicação mantida |
| Upgrade | ✅ cliente não fica abandonado, fluxo avança naturalmente |
| Kill Switch | Não afetado |
| Fluxo nunca mudo | ✅ avança para próximo nó (menu, transfer, etc.) |
| Inbox "Não respondidas" | ✅ sender_type='system' já é ignorado pela trigger |

