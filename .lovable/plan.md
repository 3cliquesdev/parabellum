

# Fix: SelectItem com valor vazio no ColumnMapper

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Causa Raiz

Quando a planilha tem colunas com cabeçalho vazio (ex: colunas extras no Excel), o `csvHeaders` inclui strings vazias `""`. No `ColumnMapper`, essas strings são passadas como `value` para `<SelectItem>`, e o Radix UI exige que `value` **nunca seja string vazia** — resultando no crash.

## Correção

**Filtrar headers vazios** no `ColumnMapper.tsx` antes de renderizar os `SelectItem`:

```tsx
// Linha que renderiza os headers do CSV
{csvHeaders.filter(h => h && h.trim() !== '').map((header) => (
  <SelectItem key={header} value={header}>
    {header}
  </SelectItem>
))}
```

Alternativamente (defesa em profundidade), também filtrar no `CSVUploader` ao parsear, removendo colunas com header vazio antes de chamar `onDataParsed`.

## Impacto
- Zero regressão — apenas ignora colunas sem nome (que não podem ser mapeadas de qualquer forma)
- Fix em 1 arquivo: `src/components/ColumnMapper.tsx`

