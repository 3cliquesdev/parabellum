

# Hardening Global de Supabase Selects

## Inventario completo de `select("*", { head: true, count: "exact" })`

Encontrados em **11 arquivos**, totalizando ~30 ocorrencias de count queries usando `"*"`:

| Arquivo | Ocorrencias | Tabelas |
|---|---|---|
| `src/hooks/useDealsCounts.tsx` | 4 | deals |
| `src/hooks/useDealsConversionAnalysis.tsx` | 4 | deals |
| `src/hooks/useMyPendingCounts.tsx` | 3 | inbox_view, tickets, deals |
| `src/hooks/useLeadsBreakdown.tsx` | 2 | deals |
| `src/hooks/useSalesRepDistributionReport.tsx` | 7 | lead_distribution_logs, deals |
| `src/hooks/useKiwifyFinancials.tsx` | 1 | kiwify_events |
| `src/hooks/useTicketStatuses.tsx` | 1 | tickets |
| `src/hooks/instagram/useInstagramStats.ts` | 5 | instagram_comments, instagram_messages |
| `src/components/AvailabilityToggle.tsx` | 1 | conversations |
| `src/hooks/useTicketCounts.tsx` | 0 (usa select com campos) | -- |
| `src/hooks/useTeamOnlineCount.tsx` | 0 (ja usa select("id")) | -- |

Total: **28 substituicoes** de `select("*", ...)` para `select("id", ...)`.

---

## Fase 1 -- Padronizar counts (100% seguro)

### 1.1 Criar helper `src/lib/supabase-count.ts`

```typescript
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

/**
 * Aplica select padrao para queries de contagem.
 * Usa "id" em vez de "*" para manter o padrao enterprise
 * e evitar ambiguidade no payload.
 * 
 * Uso: const { count } = await countQuery(supabase.from("deals")).eq(...);
 */
export function countQuery<T extends Record<string, unknown>>(
  queryBuilder: any
) {
  return queryBuilder.select("id", { count: "exact", head: true });
}
```

### 1.2 Substituicoes nos hooks (apenas trocar `"*"` por `"id"` no select)

Cada arquivo recebe a mesma mudanca cirurgica -- somente a string do select muda:

**`src/hooks/useDealsCounts.tsx`** (4 ocorrencias)
- Linhas 65, 79, 93, 106: `.select("*", { count: "exact", head: true })` -> `.select("id", { count: "exact", head: true })`

**`src/hooks/useDealsConversionAnalysis.tsx`** (4 ocorrencias)
- Linhas 86, 90, 94, 98: mesma substituicao

**`src/hooks/useMyPendingCounts.tsx`** (3 ocorrencias)
- Linhas 25, 36, 47: mesma substituicao

**`src/hooks/useLeadsBreakdown.tsx`** (2 ocorrencias)
- Linhas 39, 47: mesma substituicao

**`src/hooks/useSalesRepDistributionReport.tsx`** (7 ocorrencias)
- Linhas 81, 88, 95, 102, 109, 117, 269: mesma substituicao

**`src/hooks/useKiwifyFinancials.tsx`** (1 ocorrencia)
- Linha 104: mesma substituicao

**`src/hooks/useTicketStatuses.tsx`** (1 ocorrencia)
- Linha 175: mesma substituicao

**`src/hooks/instagram/useInstagramStats.ts`** (5 ocorrencias)
- Linhas 19, 25, 35, 42, 46: mesma substituicao

**`src/components/AvailabilityToggle.tsx`** (1 ocorrencia)
- Linha 70: mesma substituicao

### Seguranca da mudanca

Essa substituicao e 100% segura porque:
- `head: true` faz o Supabase retornar APENAS headers (sem body)
- O `count: "exact"` retorna a contagem no header `Content-Range`
- O campo no `select()` so afeta o que iria no body (que nao existe com head:true)
- Portanto `select("id")` e `select("*")` produzem o MESMO resultado quando `head: true`

---

## Fase 2 -- Guardrail ESLint

### 2.1 Regra no-restricted-syntax no `eslint.config.js`

Adicionar uma regra `no-restricted-syntax` que bloqueia chamadas `.select("*"` e `.select(\`*`:

```typescript
"no-restricted-syntax": [
  "warn",
  {
    selector: "CallExpression[callee.property.name='select'][arguments.0.value='*']",
    message: "Avoid select('*'). Use explicit fields or select('id', { head: true, count: 'exact' }) for counts."
  }
]
```

Isso cobre chamadas literais como `.select("*")` e `.select("*", { ... })`. Template literals (`.select(\`*,...\``) nao sao cobertos por AST selector, mas o unico caso encontrado (`RealtimeNotifications.tsx`) ja usa joins explicitamente.

Nivel: `warn` (nao bloqueia build, apenas sinaliza).

---

## Arquivos modificados

| Arquivo | Tipo | Mudanca |
|---|---|---|
| `src/lib/supabase-count.ts` | NOVO | Helper `countQuery()` |
| `src/hooks/useDealsCounts.tsx` | EDIT | 4x `"*"` -> `"id"` |
| `src/hooks/useDealsConversionAnalysis.tsx` | EDIT | 4x `"*"` -> `"id"` |
| `src/hooks/useMyPendingCounts.tsx` | EDIT | 3x `"*"` -> `"id"` |
| `src/hooks/useLeadsBreakdown.tsx` | EDIT | 2x `"*"` -> `"id"` |
| `src/hooks/useSalesRepDistributionReport.tsx` | EDIT | 7x `"*"` -> `"id"` |
| `src/hooks/useKiwifyFinancials.tsx` | EDIT | 1x `"*"` -> `"id"` |
| `src/hooks/useTicketStatuses.tsx` | EDIT | 1x `"*"` -> `"id"` |
| `src/hooks/instagram/useInstagramStats.ts` | EDIT | 5x `"*"` -> `"id"` |
| `src/components/AvailabilityToggle.tsx` | EDIT | 1x `"*"` -> `"id"` |
| `eslint.config.js` | EDIT | Regra no-restricted-syntax |

## Impacto

- Zero regressao: head:true ignora o campo do select, apenas count e retornado
- Padrao auditavel: todo count usa `"id"` em vez de `"*"`
- Helper reutilizavel: `countQuery()` disponivel para novos hooks
- Guardrail: ESLint avisa se alguem tentar adicionar `select("*")` novo

