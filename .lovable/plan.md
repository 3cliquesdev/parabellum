

# Fix: ID no relatório exportado não corresponde ao da conversa

## Problema

O CSV/Excel exportado mostra na coluna "ID" apenas o `short_id` (primeiros 8 caracteres do UUID). Isso pode não corresponder ao que o usuário vê na tela ou dificultar a identificação da conversa.

## Correção (1 arquivo)

### `src/hooks/useExportConversationsCSV.tsx` — Linha 78-79

Adicionar o `conversation_id` completo e formatar o `short_id` com prefixo `#` para corresponder ao que é exibido no inbox:

```typescript
const rows = (data as any[]).map((r) => ({
  "Protocolo": r.short_id ? `#${r.short_id}` : "",
  "ID Conversa": r.conversation_id || "",
  // ... restante das colunas permanece igual
}));
```

Isso garante:
1. Coluna **Protocolo** com `#XXXXXXXX` — igual ao exibido no inbox
2. Coluna **ID Conversa** com o UUID completo — permite localizar a conversa exatamente

