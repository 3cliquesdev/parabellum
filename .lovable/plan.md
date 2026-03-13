

# Fix: Fotos não aparecem em Notas Internas

## Diagnóstico

Dois problemas encontrados:

1. **SuperComposer (envio)**: Quando `isInternal=true`, o `sendInstant` é chamado **sem anexos** — os `uploadedAttachments` são ignorados completamente (linhas 367-373).

2. **InternalNoteMessage (exibição)**: O componente só renderiza `content` (texto). Não recebe nem exibe `attachments`. Mesmo que a nota tivesse attachment_url, o `MessagesWithMedia.tsx` calcula os attachments mas retorna o `InternalNoteMessage` sem passá-los (linhas 323-332).

## Mudanças

### 1. `src/components/inbox/SuperComposer.tsx`
- No bloco `if (isInternal)`, processar `uploadedAttachments` da mesma forma que os outros canais: salvar o arquivo no storage e incluir `attachment_url` na mensagem enviada via `sendInstant`.

### 2. `src/components/InternalNoteMessage.tsx`
- Aceitar prop opcional `attachments` (mesmo tipo usado no `MessageBubble`)
- Renderizar imagens/arquivos dentro do card amarelo da nota interna, usando os mesmos componentes de mídia já existentes (ex: `MediaRenderer` ou `img` tag para imagens)

### 3. `src/components/inbox/MessagesWithMedia.tsx`
- Na renderização de notas internas (linha 324-332), passar os `attachments` já calculados para o `InternalNoteMessage`

