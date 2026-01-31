
# Plano: Reprodução de Áudios no Histórico de Conversas

## Análise da Situação Atual

Analisei o projeto atual e sigo as regras da base de conhecimento.

**Boa notícia:** A infraestrutura para reproduzir áudios JÁ ESTÁ IMPLEMENTADA e funcional!

### Arquitetura Existente (Preservada)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE REPRODUÇÃO DE ÁUDIO                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  useMessages()                                                  │
│       ↓                                                         │
│  Carrega messages + media_attachments (waveform, duration)     │
│       ↓                                                         │
│  MessagesWithMedia                                              │
│       ↓                                                         │
│  useMediaUrls() → get-media-url (Edge Function)                │
│       ↓                                                         │
│  MessageBubble → MediaPreview                                   │
│       ↓                                                         │
│  AudioPlayer (com waveform visual, velocidade, download)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes Envolvidos
- `useMessages.tsx` - Carrega mensagens com `media_attachments`
- `MessagesWithMedia.tsx` - Mapeia attachments e usa fallback para `attachment_url`
- `useMediaUrls.tsx` - Gera signed URLs com retry automático
- `MediaPreview.tsx` - Detecta tipo e renderiza player apropriado
- `AudioPlayer.tsx` - Player robusto com waveform, velocidade (1x/1.25x/1.5x/2x), download

### Dados no Banco (Verificado)
Os áudios recebidos de clientes estão corretamente salvos:
- `media_attachments` com `status: ready`
- `storage_bucket: chat-media`
- `storage_path: whatsapp/*.ogg`
- `mime_type: audio/ogg`

## Diagnóstico

O problema reportado era na **gravação/conversão** (preview), que você confirmou funcionar no publicado.

A reprodução de áudios recebidos **deve funcionar** com a implementação atual. Se não estiver funcionando, pode ser:

1. **RLS/Permissões** - Agentes sem role `agent` no banco
2. **Signed URL expirando** - Cache de 1h, mas retry automático existe
3. **Fallback não ativando** - Para mensagens antigas sem `media_attachments`

## Ação Recomendada: Verificação

Antes de qualquer mudança, precisamos confirmar:

1. **Abrir uma conversa com áudios recebidos no publicado**
2. **Verificar se os players de áudio aparecem nas mensagens**
3. **Clicar play e confirmar reprodução**

Se NÃO funcionar, as possíveis causas são:
- Erro no console (F12)
- `media_attachments` sem `storage_bucket` correto
- Edge function `get-media-url` retornando erro

## Próximos Passos (Se Necessário)

Se após verificação confirmar que não funciona, podemos:

1. **Melhorar fallback** em `MessagesWithMedia` para usar `attachment_url` diretamente quando disponível (já existe mas pode precisar ajuste)

2. **Adicionar logs visuais** para debug de carregamento de mídia

3. **Verificar RLS** na tabela `media_attachments`

---

**Resumo:** O sistema de reprodução de áudios está implementado. Recomendo testar no ambiente publicado para confirmar funcionamento. O problema de gravação no preview é isolado e não afeta a reprodução de áudios recebidos.
