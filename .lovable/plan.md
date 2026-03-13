

# Auditoria Completa: Fotos Quebradas e Incorretas no Chat

## Problemas Identificados

Após auditar toda a cadeia de mídia (recebimento → armazenamento → exibição), encontrei **4 bugs críticos**:

### Bug 1: Bucket Inconsistente entre Meta e Evolution API
- `handle-whatsapp-event` (Evolution API) salva mídias no bucket **`chat-attachments`**
- `download-meta-media` (Meta API) salva mídias no bucket **`chat-media`**
- O `get-media-url` lê o `storage_bucket` do registro, mas a inconsistência causa confusão e possíveis falhas se um bucket não existir ou tiver policies diferentes

### Bug 2: Falta `conversation_id` no download-meta-media
- O `download-meta-media` cria o registro em `media_attachments` **sem `conversation_id`**
- O `get-media-url` precisa de `conversation_id` para verificar permissões de acesso
- Resultado: fotos de mensagens Meta podem retornar erro 404 ou 403

### Bug 3: Download fire-and-forget no Meta webhook
- O `meta-whatsapp-webhook` (linha 636) faz `fetch()` **sem `await`** para baixar mídia
- A mídia pode não estar pronta quando o usuário abre a conversa
- Sem mecanismo de retry se o download falhar silenciosamente

### Bug 4: Fallback de `attachment_url` com URL pública
- `download-meta-media` grava uma URL pública (`getPublicUrl`) no campo `attachment_url` da mensagem
- Se o bucket `chat-media` for privado, essa URL não funciona
- O fallback no frontend (`MessagesWithMedia.tsx` linha 182-194) tenta usar essa URL diretamente, resultando em imagem quebrada

## Plano de Correção

### Correção 1: Unificar bucket para `chat-attachments`
- Alterar `download-meta-media` para usar bucket `chat-attachments` em vez de `chat-media`
- Manter consistência com `handle-whatsapp-event` e `upload-chat-media`

### Correção 2: Adicionar `conversation_id` ao `download-meta-media`
- Receber `conversation_id` como parâmetro no request body
- Incluir no registro de `media_attachments` para que o `get-media-url` funcione corretamente com verificação de permissões

### Correção 3: Atualizar `meta-whatsapp-webhook` para passar `conversation_id`
- Incluir `conversation_id` no payload enviado ao `download-meta-media`

### Correção 4: Remover `getPublicUrl` do download-meta-media
- Usar apenas o `storage_path` no registro, e deixar o `get-media-url` gerar signed URLs
- Não gravar URL pública no `attachment_url` (evita URLs que não funcionam)

### Arquivos Alterados
1. `supabase/functions/download-meta-media/index.ts` — unificar bucket, adicionar `conversation_id`, remover publicUrl
2. `supabase/functions/meta-whatsapp-webhook/index.ts` — passar `conversation_id` no payload do download

