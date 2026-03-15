

# Adicionar label "Seller" ao campo do buyer_name

## Mudança

### `src/components/support/AdminReturnDialog.tsx`

No bloco que exibe o `buyerName` (linhas ~154-158), adicionar um título "Seller" acima do nome:

```tsx
{lookupResult?.found && buyerName && (
  <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
    <p className="text-xs text-muted-foreground">Seller</p>
    <p className="font-medium">{buyerName}</p>
  </div>
)}
```

