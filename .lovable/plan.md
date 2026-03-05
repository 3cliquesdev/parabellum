

# Plano: Corrigir colunas Ganho/Perdido vazias no Kanban

## Problema

No hook `useDeals.tsx` (linha 67-71), quando nenhum filtro de status é selecionado, a query aplica `status = "open"` como default. Isso faz com que deals ganhos e perdidos **nunca sejam buscados do banco**, e as colunas "Ganho" e "Perdido" do Kanban ficam sempre com "Nenhum negócio".

```typescript
// Código atual (useDeals.tsx:67-71)
if (filters.status && filters.status.length > 0) {
  query = query.in("status", filters.status);
} else {
  query = query.eq("status", "open"); // ← Exclui won/lost
}
```

Isso afeta **todos os roles**, não só sales_rep.

## Solução

Alterar o default de status no `useDeals.tsx` para buscar `["open", "won", "lost"]` quando nenhum filtro de status é selecionado. Isso garante que as colunas de status do Kanban recebam dados.

```typescript
// Novo comportamento
if (filters.status && filters.status.length > 0) {
  query = query.in("status", filters.status);
}
// Sem else → busca todos os status (open, won, lost)
```

**Nota**: As colunas normais do Kanban já filtram por `deal.status === "open"` no JSX (linha 744 do Deals.tsx), então won/lost não vão aparecer duplicados nas colunas de etapa.

## Impacto

- **Zero regressão**: Colunas de etapa já filtram `status === "open"` no frontend
- **Performance**: Query retorna mais registros (won+lost), mas são dados que o Kanban precisa exibir
- **Todos os roles**: Fix beneficia admin, manager e sales_rep igualmente

## Arquivo alterado

| Arquivo | Alteração |
|---|---|
| `src/hooks/useDeals.tsx` | Remover o `else { eq("status", "open") }` no bloco de filtro de status |

