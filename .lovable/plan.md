

# Ajuste Final — Telemetria AI Dashboard

## O que muda

### Hook (`useAIDecisionTelemetry.ts`)
- Exportar `isError` e `error` do useQuery (para error state na página)
- KPI filters e lastUpdated já estão corretos — sem mudança funcional

### Página (`AITelemetry.tsx`) — rewrite completo
Os gaps atuais vs o prompt:

| Item | Atual | Necessário |
|------|-------|------------|
| REASON_LABELS | Inglês ("RAG Handoff") | Português ("RAG Estrito", "Confiança Zero") |
| REASON_COLORS | HSL values | Hex: #ef4444, #f59e0b, #f97316, #eab308, #a855f7, #6b7280 |
| KPI cards | `KPIScorecard` component | Cards customizados com cores específicas (amber-400, red-400, orange-400) |
| Line chart color | `hsl(var(--primary))` | `#6366f1` |
| Sort toggle | Sem botão visível | Botão com ArrowUpDown ao lado do Select |
| Score colors | Semantic tokens | `text-green-400`, `text-yellow-400`, `text-red-400` |
| Fallback check | `text-warning` | `text-green-400` |
| Context badge | outline | Indigo badge |
| Error state | Ausente (crash) | Inline alert + retry |
| Time refresh | Nenhum | `useEffect` com interval 30s para forçar re-render dos tempos relativos |
| Loading skeletons | 6 rows genéricas | 4 KPI skeletons + chart skeletons + 8 table rows |
| getReasonLabel | Prefixo "Violação:" para restriction_violation_* | Usar reasonLabels map direto |

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAIDecisionTelemetry.ts` | Exportar `isError`/`error` do useQuery |
| `src/pages/AITelemetry.tsx` | Rewrite com todas as correções visuais acima |

