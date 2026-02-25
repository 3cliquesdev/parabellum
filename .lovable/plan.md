

# Plano: Widget de Leads por Formulário (Gráfico de Linha)

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Objetivo

Adicionar um widget de gráfico de linha na aba de Analytics de Vendas (`SalesDashboardTab`) mostrando leads de formulários por dia nos últimos 30 dias, com filtro de período integrado ao `dateRange` já existente.

## Mudanças

### 1. Novo hook: `src/hooks/useFormSubmissionsDaily.tsx`

Query na tabela `form_submissions` agrupando por dia (`DATE(created_at)`):
- Recebe `startDate` e `endDate` do dateRange (default: últimos 30 dias)
- Retorna array `{ date: string, count: number }[]`
- Usa `formatLocalDate` do `src/lib/dateUtils.ts` para consistência de timezone
- `queryKey: ['form-submissions-daily', startStr, endStr]`
- `staleTime: 30000`

A query busca todos os registros no período e agrupa no client-side (a tabela `form_submissions` não tem RPC de agregação). Alternativa: buscar apenas `id, created_at` para minimizar payload.

### 2. Novo widget: `src/components/widgets/FormLeadsChartWidget.tsx`

- Card com título "Leads de Formulários" e ícone `FileText`
- Gráfico de linha (recharts `AreaChart`) similar ao `RevenueEvolutionWidget`
- Eixo X: datas (dd/MM)
- Eixo Y: quantidade de leads
- Tooltip com data e contagem
- Estados: loading (Skeleton), vazio ("Sem dados"), e dados normais
- Recebe `dateRange` como prop para filtrar

### 3. `src/components/dashboard/SalesDashboardTab.tsx` — Adicionar widget

Adicionar como ROW 6 (full width, span 4) ou span 2 ao lado de outro widget. Sugestão: inserir como `BentoCard span="full"` após ROW 5 para destaque.

Passar o `dateRange` existente da prop para o widget.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useFormSubmissionsDaily.tsx` | **Novo** — hook de query diária de form_submissions |
| `src/components/widgets/FormLeadsChartWidget.tsx` | **Novo** — widget com AreaChart de leads/dia |
| `src/components/dashboard/SalesDashboardTab.tsx` | Importar e adicionar o widget na grid |

## Impacto

- Zero regressão: apenas adição de novo widget na grid existente
- Usa o `dateRange` já propagado pelo dashboard pai
- Padrão visual consistente com `RevenueEvolutionWidget` (AreaChart, gradiente, tooltip)

