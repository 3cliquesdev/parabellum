

# Fix: Edge function `analyze-dashboard` deve coletar dados reais do banco

## Problema

O `SupportTab` passa apenas `{ context: 'support', message: '...' }` para o `AIExecutiveSummary`. A edge function recebe esse payload vazio e a IA não tem dados concretos para analisar — por isso gera respostas genéricas como "não foi possível coletar KPIs".

## Solução

Modificar a edge function `analyze-dashboard` para **consultar o banco diretamente** quando o contexto for `support`, usando as RPCs já existentes. Assim a IA recebe dados reais.

**Arquivo: `supabase/functions/analyze-dashboard/index.ts`**

1. Criar um client Supabase dentro da edge function (usando `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
2. Quando `context === 'support'`, chamar as RPCs:
   - `get_support_metrics_consolidated(p_start, p_end)` → FRT, MTTR, CSAT
   - `get_support_dashboard_counts(p_start, p_end)` → tickets abertos, conversas, SLA risk
3. Mesclar os resultados reais com o `metricsData` recebido do frontend
4. Passar o payload enriquecido para o prompt da IA

**Arquivo: `src/components/analytics/SupportTab.tsx`**

- Sem mudanças necessárias (a edge function agora busca os dados sozinha)

## Resultado esperado

A IA receberá dados como:
```json
{
  "avgFRT": 12.5,
  "avgMTTR": 45.2,
  "avgCSAT": 4.2,
  "totalRatings": 38,
  "tickets_open": 7,
  "conversations_total": 124,
  "conversations_closed": 98,
  "sla_risk": 3
}
```

E gerará análises concretas baseadas em números reais em vez de "falta de dados".

## Impacto
- Zero regressão: os demais contextos (sales, ai, etc.) continuam funcionando igual
- Upgrade: o contexto `support` agora coleta dados automaticamente

