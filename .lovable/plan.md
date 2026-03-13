
# Auditoria Completa: Estado Atual das Correções

## 1. download-meta-media — OK (4/4 bugs corrigidos)

| Bug | Status |
|-----|--------|
| Bucket unificado `chat-attachments` | Corrigido (linha 114) |
| `conversation_id` no `media_attachments` | Corrigido (linhas 149-152) |
| `getPublicUrl` removido → usa `storage:` prefix | Corrigido (linha 170) |
| Parâmetro tipado na interface | Corrigido (linha 21) |

## 2. meta-whatsapp-webhook — OK (conversation_id passado)

O `conversation_id: conversation.id` é passado no body do fetch (linha 649). Corrigido.

## 3. ai-autopilot-chat — OK (flow sovereignty)

| Item | Status |
|------|--------|
| `hasActiveFlow` check antes do handoff | Corrigido (linha 9370) |
| Mensagem de retry genérica para fluxo ativo | Corrigido (linhas 9390-9392) |
| Handoff só sem fluxo | Corrigido (linha 9459) |
| Strip pattern "conectar com" | Corrigido (linha 8551) |

## 4. GAP IDENTIFICADO: Frontend Fallback para `storage:` URLs

**Problema residual**: O fallback em `MessagesWithMedia.tsx` (linha 184) verifica `startsWith('http')` para renderizar mídia diretamente. Agora que o `download-meta-media` grava `storage:chat-attachments/...`, mensagens onde o `media_attachments` record **falhou** (linha 160-161 mostra que é um `⚠️` warning, não um erro fatal) terão `attachment_url = "storage:..."` mas nenhum `media_attachments` record para gerar signed URL.

**Impacto**: Baixo — o record só falha se houver erro de banco. Mas para robustez, o fallback deveria detectar `storage:` URLs e resolver via signed URL diretamente.

### Correção proposta

Em `MessagesWithMedia.tsx`, adicionar handling para `storage:` prefixed URLs no fallback (linhas 182-202):

```typescript
if (attachments.length === 0 && message.attachment_url && !isAI) {
  const isValidUrl = message.attachment_url.startsWith('http');
  const isStorageRef = message.attachment_url.startsWith('storage:');
  
  if (isStorageRef) {
    // Parse storage reference e resolver via get-media-url ou signed URL
    // Formato: "storage:bucket/path"
    // Neste caso, criar um pseudo-attachment para que useMediaUrls resolva
  } else if (isValidUrl) {
    // Comportamento existente
  }
}
```

**Recomendação**: Implementar este fallback para cobrir o edge case.

## 5. Bug Adicional: Fire-and-forget persiste

O `meta-whatsapp-webhook` (linha 636) ainda faz `fetch()` sem `await` para o download de mídia. Isso significa:
- A mídia pode não estar pronta quando o usuário abre a conversa
- Erros de download são logados mas não tratados

**Impacto**: Médio — o retry manual (botão retry no frontend) mitiga, mas a experiência inicial pode mostrar mídia em loading.

**Correção possível**: Não é viável fazer `await` pois bloquearia o webhook (Meta tem timeout de 5s). O design fire-and-forget é intencional. O frontend já tem mecanismo de retry com `useMediaUrls`. Aceitável como está.

## Resumo

| Área | Status |
|------|--------|
| Bucket unificado | OK |
| conversation_id no download | OK |
| Public URL removida | OK |
| Flow sovereignty no error handler | OK |
| Strip patterns atualizados | OK |
| Frontend fallback para `storage:` | Precisa correção (edge case) |
| Fire-and-forget no webhook | Aceitável (by design) |

### Plano de ação: 1 correção restante

Atualizar `src/components/inbox/MessagesWithMedia.tsx` para tratar `attachment_url` com prefixo `storage:` — extrair bucket e path, e usar a edge function `get-media-url` como fallback em vez de tentar carregar a URL diretamente.
