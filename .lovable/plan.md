
# Fix: Deals do funil nao aparecem em todas as etapas

## Causa raiz

A query `useDeals` aplica `ORDER BY created_at DESC LIMIT 50` sem filtrar por status. Como o pipeline tem ~2000+ deals (open + won + lost), os 50 mais recentes sao quase todos do estagio "Oportunidade" (que tem 528 open + 1490 won/lost). Os 51 deals abertos em "Primeiro Contato" foram criados antes e ficam fora do limite.

Resumo do problema:

```text
Query retorna: 50 deals mais recentes (mistura open/won/lost)
Kanban filtra: apenas status=open
Resultado: so aparece Oportunidade, outras etapas ficam vazias
```

Dados reais no banco:

| Estagio | Open | Won | Lost |
|---|---|---|---|
| Oportunidade | 528 | 758 | 732 |
| Primeiro Contato | 51 | 13 | 24 |
| Outros | 1 | 739 | 6 |

## Correcao

No `useDeals.tsx`, quando nenhum filtro de status for aplicado pelo usuario (array vazio), aplicar automaticamente `status = 'open'` na query do banco. Isso garante que os 50 deals retornados sao todos open, cobrindo todas as etapas.

Quando o usuario escolher filtrar por status especifico (won, lost, ou combinacao), respeitar a escolha dele normalmente.

Alem disso, aumentar o limite default de 50 para 500 quando filtrando por open (deals abertos sao o working set do kanban e precisam estar todos visiveis).

## Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useDeals.tsx` | Aplicar `status=open` como default quando `filters.status` esta vazio; aumentar limite para 500 nesse caso |

## Detalhe tecnico

```typescript
// Antes (bug): sem filtro de status, retorna mix de open/won/lost
if (filters.status && filters.status.length > 0) {
  query = query.in("status", filters.status);
}
// limit = 50

// Depois (fix): default open quando nenhum status selecionado
if (filters?.status && filters.status.length > 0) {
  query = query.in("status", filters.status);
} else {
  query = query.eq("status", "open"); // default: so open
}
// limit = 500 (open deals sao o working set)
```

## Impacto

- Zero regressao: filtros manuais de status continuam funcionando
- Kanban vai mostrar todos os deals open em todas as etapas
- Performance: filtrar por `status=open` no banco (indexado) e mais eficiente que trazer tudo e filtrar no frontend
- O `filteredDeals` no `Deals.tsx` continua funcionando normalmente para URL params (open/won/lost/rotten)
