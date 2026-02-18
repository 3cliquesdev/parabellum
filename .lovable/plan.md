

## Colar Imagens no Chat do Inbox (Ctrl+V / Cmd+V)

### Problema
Hoje, para enviar uma imagem no inbox, o agente precisa clicar no botao de anexo e selecionar o arquivo manualmente. Nao e possivel simplesmente copiar uma imagem (print screen, imagem da web, etc.) e colar com Ctrl+V no campo de mensagem.

### Solucao
Adicionar um listener de `paste` no Textarea do `SuperComposer.tsx` que detecta imagens no clipboard e as envia automaticamente pelo fluxo de upload existente (`handleFileSelect`).

### Alteracoes

**Arquivo: `src/components/inbox/SuperComposer.tsx`**

1. Adicionar handler `handlePaste` que:
   - Intercepta o evento `paste` no textarea
   - Verifica se ha itens de imagem no `clipboardData`
   - Para cada imagem encontrada, converte o `DataTransferItem` em `File`
   - Chama `handleFileSelect(file)` (fluxo ja existente de upload + preview)
   - Previne o comportamento padrao apenas se uma imagem for detectada (texto colado continua funcionando normalmente)

2. Conectar o handler ao textarea via `onPaste={handlePaste}`

Pseudocodigo:

```text
const handlePaste = (e: React.ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        // Gerar nome amigavel com timestamp
        const ext = file.type.split('/')[1] || 'png';
        const named = new File([file], `clipboard-${Date.now()}.${ext}`, { type: file.type });
        handleFileSelect(named);
      }
      return; // processar apenas a primeira imagem
    }
  }
  // Se nao for imagem, deixa o paste normal de texto acontecer
};
```

### O que NAO muda
- Fluxo de upload existente (useMediaUpload) permanece intacto
- FileDropZone continua funcionando normalmente
- Preview de imagem, retry, remocao de anexo — tudo inalterado
- Colar texto normal continua funcionando
- Kill Switch, Shadow Mode, CSAT, distribuicao: nao afetados

### Resultado
O agente podera copiar qualquer imagem (print screen, imagem da web, de outro app) e colar diretamente no campo de mensagem com Ctrl+V. A imagem aparecera na area de preview de anexos e sera enviada junto com a mensagem.
