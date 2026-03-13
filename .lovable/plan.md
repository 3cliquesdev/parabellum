

# Melhorias de UX no Chat — Delay Percebido

## Análise do Estado Atual

Após auditar os arquivos relevantes, o sistema já possui:

| Feature | Status |
|---------|--------|
| Optimistic rendering (status `sending`) | ✅ Implementado (`useSendMessage.onMutate`) |
| MessageStatusIndicator (⏱ → ✓✓ → ❌) | ✅ Implementado |
| Realtime subscription (postgres_changes) | ✅ Implementado com dedup, catch-up, heartbeat |
| Auto-scroll (stick to bottom) | ✅ Parcial — scrolla, mas sem badge "Nova mensagem ↓" |
| Typing indicator | ❌ Não existe |
| Timestamps relativos | ❌ Usa apenas `HH:mm` absoluto |

## Plano — 3 Melhorias (sem breaking changes)

### 1. Typing Indicator (após envio de mensagem)

**Arquivo:** `src/components/ChatWindow.tsx`

Adicionar estado `isWaitingResponse` que ativa quando o agente envia mensagem e desativa quando chega uma resposta (via realtime). Renderizar o componente de 3 dots animados abaixo da última mensagem.

- `isWaitingResponse = true` → no `handleSendMessage` após envio bem-sucedido (não em notas internas)
- `isWaitingResponse = false` → quando nova mensagem INSERT chega no realtime (já tratado em `useMessages`)
- Timeout de segurança: 60s para desativar automaticamente
- Renderizar antes do `messagesEndRef` no scroll area

Componente inline (já existe estilo similar em `StreamingMessage.tsx` e `ChatFlowSimulator.tsx`).

### 2. Badge "Nova mensagem ↓" (quando scrollou para cima)

**Arquivo:** `src/components/ChatWindow.tsx`

Quando `shouldStickToBottom === false` e uma nova mensagem chega:
- Mostrar badge flutuante "Nova mensagem ↓" posicionado no bottom do scroll container
- Ao clicar, faz `scrollToBottom({ behavior: 'smooth' })`
- Rastrear via `newMessageWhileScrolledUp` state

### 3. Timestamps Relativos

**Arquivo:** `src/components/inbox/MessageBubble.tsx`

Substituir `format(new Date(createdAt), "HH:mm")` por função inteligente:
- < 1 min: "agora"
- < 60 min: "há X min"
- ≥ 60 min: `HH:mm` (absoluto)
- Atualizar a cada 60s via `useEffect` + `setInterval` no `ChatWindow` que força re-render com um `tickCounter`

### Arquivos Alterados
1. `src/components/ChatWindow.tsx` — typing indicator state, new message badge, tick counter
2. `src/components/inbox/MessageBubble.tsx` — timestamps relativos
3. Nenhum arquivo novo necessário

### Impacto
- Zero breaking changes — todas as melhorias são aditivas
- Nenhuma alteração em hooks de dados ou edge functions
- Performance: tick counter a cada 60s é negligível

