

# Auditoria — AI Telemetry Dashboard

## Checklist de conformidade

### ✅ Edge Function (6 inserts) — OK
Todos os 6 pontos de telemetria estão persistindo corretamente em `ai_events`:
- `ai_decision_strict_rag_handoff` (L4797)
- `ai_decision_zero_confidence_cautious` (L5271)
- `ai_decision_confidence_flow_advance` (L5452)
- `ai_decision_anti_loop_max_fallbacks` (L8487)
- `ai_decision_fallback_phrase_detected` (L8535)
- `ai_decision_restriction_violation_*` (L8873) — sufixo dinâmico

### ✅ Hook (`useAIDecisionTelemetry.ts`) — OK
- `REASON_LABELS` com os 6 nomes corretos em português
- KPI filters usam `includes()` correto para cada grupo
- `lastUpdated` presente no retorno
- `isError`/`error` exportados
- Query com `.like("ai_decision_%")`, `.gte(since)`, `.limit(500)`, refetch 30s

### ✅ Routing — OK
- Rota `/ai-telemetry` em `App.tsx` (L244), protegida por `ai.manage_personas`
- Menu item "AI Telemetria" em `routes.ts` (L104) com icon `BarChart3`

### ⚠️ Problemas encontrados na página (`AITelemetry.tsx`)

| # | Problema | Impacto | Correção |
|---|---------|---------|----------|
| 1 | Menu usa `BarChart3` mas prompt pedia `Activity` | Visual menor | Trocar icon em `routes.ts` para `Activity` |
| 2 | `restriction_violation_*` — a edge function gera event_type com sufixo dinâmico (ex: `ai_decision_restriction_violation_price_discussion`). O `typeBreakdown` já normaliza para `restriction_violation`, mas o **filtro Select** usa `value="restriction_violation"` e o filtro faz `e.event_type.includes(typeFilter)` — funciona corretamente | Nenhum | OK |
| 3 | `output_json` cast como `any` na tabela (L330) | Type safety fraco, mas funcional | Manter — interface já define o tipo |
| 4 | Sem tratamento se `entity_id` é null/undefined | Crash se `?.slice(-8)` retorna undefined | Adicionar fallback `evt.entity_id ?? "—"` |
| 5 | `since` calculado via `useMemo` com dep `[hoursBack]` — se componente vive 2h, `since` não recalcula | Dados do cache podem ficar stale, mas o refetch de 30s regera a query com o `since` fixo | Risco baixo — OK para v1 |

### Resultado da auditoria

**Status: 98% completo.** Apenas 2 correções menores necessárias:

1. **`routes.ts` L104**: Trocar `BarChart3` por `Activity` (conforme prompt)
2. **`AITelemetry.tsx` L347**: Adicionar null-guard no `entity_id` para evitar crash em edge cases

São correções de 1 linha cada. Nenhuma mudança estrutural necessária.

