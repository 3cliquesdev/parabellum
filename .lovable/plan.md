

## Plano: Corrigir Envio de Midia para Clientes (WhatsApp)

### Problema Identificado

Quando voces enviam foto, video ou audio, o cliente **nao recebe**. Isso acontece porque:

1. A midia que voces fazem upload vai para o bucket `chat-attachments` (PRIVADO)
2. O sistema gera uma **signed URL** (URL temporaria do Supabase) 
3. Essa URL e enviada para a API do Meta WhatsApp
4. O Meta tenta baixar a midia dessa URL, mas **falha** porque:
   - O Meta nao consegue acessar signed URLs de storage privado de forma confiavel
   - Signed URLs podem ter problemas com redirecionamentos ou headers especiais

**Prova nos dados:**
```
chat-attachments: public = false  ← Voces enviam para ca
chat-media:       public = true   ← Clientes enviam para ca (funciona)
```

---

### Solucao Proposta

Ao inves de enviar a URL do Supabase para o Meta, vamos fazer **upload da midia diretamente para o Meta** usando a [Media API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media). O Meta retorna um `media_id` que podemos usar para enviar a mensagem.

**Fluxo Corrigido:**
```text
Usuario faz upload no chat
        │
        ▼
    upload-chat-media
   (salva no Supabase)
        │
        ▼
   send-meta-whatsapp
        │
        ├─► Se media.url: Fazer upload para Meta primeiro
        │       │
        │       ▼
        │   POST /v18.0/{phone_number_id}/media
        │       │
        │       ▼
        │   Obter media_id do Meta
        │
        ▼
   Enviar mensagem com media_id (nao URL)
        │
        ▼
   Cliente recebe no WhatsApp ✅
```

---

### Alteracoes Tecnicas

#### Arquivo: `supabase/functions/send-meta-whatsapp/index.ts`

**Adicionar funcao de upload para Meta:**

```typescript
async function uploadMediaToMeta(
  phoneNumberId: string,
  accessToken: string,
  mediaUrl: string,
  mimeType: string
): Promise<string> {
  // 1. Baixar arquivo da URL do Supabase
  const mediaResponse = await fetch(mediaUrl);
  if (!mediaResponse.ok) {
    throw new Error(`Failed to download media: ${mediaResponse.status}`);
  }
  const mediaBlob = await mediaResponse.blob();
  
  // 2. Fazer upload para Meta
  const formData = new FormData();
  formData.append('file', mediaBlob, 'media');
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', mimeType);
  
  const uploadResponse = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }
  );
  
  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Meta media upload failed: ${error}`);
  }
  
  const { id: mediaId } = await uploadResponse.json();
  return mediaId;
}
```

**Modificar logica de envio de midia (linhas 193-221):**

```typescript
// Media Message (MODIFICADO)
else if (body.media) {
  let mediaPayload: Record<string, unknown> = {};

  // Se tem URL, fazer upload para Meta primeiro
  if (body.media.url) {
    console.log("[send-meta-whatsapp] 📤 Uploading media to Meta first...");
    const mediaId = await uploadMediaToMeta(
      instance.phone_number_id,
      instance.access_token,
      body.media.url,
      getMimeTypeFromMediaType(body.media.type) // helper function
    );
    console.log("[send-meta-whatsapp] ✅ Media uploaded to Meta:", mediaId);
    mediaPayload.id = mediaId;
  } else if (body.media.media_id) {
    mediaPayload.id = body.media.media_id;
  } else {
    return new Response(
      JSON.stringify({ error: "Media requires url or media_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Adicionar caption e filename
  if (body.media.caption && ["image", "video", "document"].includes(body.media.type)) {
    mediaPayload.caption = body.media.caption;
  }
  if (body.media.filename && body.media.type === "document") {
    mediaPayload.filename = body.media.filename;
  }

  result = await sendToMetaApi(instance.phone_number_id, instance.access_token, {
    recipient_type: "individual",
    to: toNumber,
    type: body.media.type,
    [body.media.type]: mediaPayload,
  });
}
```

**Helper para MIME types:**

```typescript
function getMimeTypeFromMediaType(type: string): string {
  const mimeTypes: Record<string, string> = {
    image: 'image/jpeg',
    audio: 'audio/ogg',
    video: 'video/mp4',
    document: 'application/pdf',
    sticker: 'image/webp',
  };
  return mimeTypes[type] || 'application/octet-stream';
}
```

---

### Resumo das Alteracoes

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `supabase/functions/send-meta-whatsapp/index.ts` | Edicao | Adicionar upload para Meta antes de enviar midia |

### Fluxo Apos Correcao

1. Agente seleciona foto/video/audio
2. Upload vai para Supabase (bucket privado - OK)
3. Signed URL e gerada
4. `send-meta-whatsapp` BAIXA a midia da signed URL
5. `send-meta-whatsapp` FAZ UPLOAD para Meta (retorna `media_id`)
6. Mensagem e enviada com `media_id` (nao URL)
7. Cliente recebe a midia no WhatsApp

### Garantias

- **Nao quebra nada existente**: O bucket continua privado (seguranca)
- **Compatibilidade**: Se ja tiver `media_id`, usa direto
- **Logs detalhados**: Cada etapa sera logada para debug
- **Retry automatico**: Se upload falhar, erro claro no toast

