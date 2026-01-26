

## Plano: Tornar Audio, Texto e Video Robustos no Chat

### Problemas Identificados

Apos analise detalhada do codigo e logs, identifiquei os seguintes problemas:

1. **Colunas incorretas no `download-meta-media`**: A Edge Function tenta inserir em colunas que nao existem (`file_name`, `file_type`, `url`)

2. **Midias Meta nao criam `media_attachments`**: Quando uma midia chega via Meta WhatsApp, o arquivo e salvo no Storage mas o registro em `media_attachments` falha, deixando a midia sem vinculo

3. **UI depende de `media_attachments`**: O componente `MessagesWithMedia` so exibe midias com registros em `media_attachments` com `status = 'ready'`

4. **Fallback ausente**: Quando `media_attachments` esta vazio, a UI nao mostra a midia mesmo tendo `attachment_url` na mensagem

### Solucao Proposta

```text
+------------------+     +-----------------------+     +------------------+
|  Meta Webhook    | --> | download-meta-media   | --> | media_attachments|
|  (recebe midia)  |     | (corrigir colunas)    |     | (registro OK)    |
+------------------+     +-----------------------+     +------------------+
                                  |
                                  v
                         +------------------+
                         |   messages       |
                         | (attachment_url) |
                         +------------------+
                                  |
                                  v
                         +------------------------+
                         | MessagesWithMedia      |
                         | (fallback para URL     |
                         |  direta se nao tem     |
                         |  media_attachments)    |
                         +------------------------+
```

### Tarefas de Implementacao

#### 1. Corrigir Edge Function `download-meta-media` (Critico)

Atualizar para usar as colunas corretas da tabela:

- `file_name` -> `original_filename`
- `file_type` -> `mime_type` 
- `url` -> remover (usar `storage_path` + `storage_bucket`)
- Adicionar `status: 'ready'` e `storage_bucket: 'chat-media'`

#### 2. Adicionar Fallback no `MessagesWithMedia`

Quando uma mensagem tem `attachment_url` mas nao tem `media_attachments`, criar um attachment virtual:

- Detectar tipo de midia pelo `attachment_type` ou extensao da URL
- Usar a URL publica diretamente (nao precisa de signed URL para bucket publico)
- Permitir visualizacao imediata

#### 3. Melhorar AudioPlayer para URLs Publicas

- Garantir que o player funcione com URLs publicas do Storage
- Adicionar melhor tratamento de erro com retry automatico

#### 4. Criar Script de Migracao

Para midias Meta existentes que falharam, criar registros em `media_attachments`:

- Buscar mensagens com `attachment_url` mas sem `media_attachments`
- Criar registros retroativamente

### Detalhes Tecnicos

**Correcao em `download-meta-media/index.ts`:**

```typescript
// ANTES (incorreto)
.insert({
  message_id: message_id,
  file_name: fileName,      // ERRADO
  file_type: mimeType,      // ERRADO
  file_size: fileBuffer.byteLength,
  storage_path: storagePath,
  url: publicUrl,           // ERRADO - coluna nao existe
})

// DEPOIS (correto)
.insert({
  message_id: message_id,
  original_filename: fileName,
  mime_type: mimeType,
  file_size: fileBuffer.byteLength,
  storage_path: storagePath,
  storage_bucket: 'chat-media',
  status: 'ready',
})
```

**Fallback em `MessagesWithMedia.tsx`:**

```typescript
// Mapear attachments (incluindo fallback para attachment_url)
let attachments = [];

// 1. Primeiro tentar media_attachments (sistema novo)
if (message.media_attachments?.length > 0) {
  attachments = message.media_attachments
    .filter(a => a.status === 'ready')
    .map(a => ({ /* ... signed URL logic */ }));
}

// 2. Fallback: usar attachment_url direto (midias publicas)
if (attachments.length === 0 && message.attachment_url) {
  const isPublicUrl = message.attachment_url.includes('/public/');
  if (isPublicUrl) {
    attachments = [{
      id: message.id,
      url: message.attachment_url,
      mimeType: getMimeFromType(message.attachment_type),
      filename: extractFilename(message.attachment_url),
      isLoading: false,
    }];
  }
}
```

### Beneficios

1. **Retrocompatibilidade**: Midias antigas continuam funcionando
2. **Robustez**: Fallback garante que midia sempre aparece
3. **Performance**: URLs publicas nao precisam de signed URL
4. **Manutencao**: Corrige o problema na raiz para novas midias

### Ordem de Execucao

1. Corrigir `download-meta-media` para novas midias
2. Adicionar fallback em `MessagesWithMedia` para midias existentes
3. Testar envio/recebimento de audio, imagem e video
4. (Opcional) Executar migracao para criar registros faltantes

