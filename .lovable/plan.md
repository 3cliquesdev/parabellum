

# Plano: Relatório Excel — Leads de Formulário vs Conversão

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Objetivo

Criar uma página de relatório no menu Relatórios (aba Vendas) que exibe e exporta em Excel a comparação entre leads criados por formulário (`form_submissions`) e deals fechados (`deals` com `lead_source = 'formulario'` e `status = 'won'`).

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useFormLeadsConversionReport.tsx` | **Novo** — hook com queries paralelas em `form_submissions` + `deals` |
| `src/hooks/useExportFormLeadsExcel.tsx` | **Novo** — exportação Excel com XLSX |
| `src/pages/FormLeadsConversionReport.tsx` | **Novo** — página com KPIs, tabela diária e botão exportar Excel |
| `src/pages/Reports.tsx` | Adicionar card na aba Vendas com `route: '/reports/form-leads-conversion'` |
| `src/App.tsx` | Adicionar rota protegida `/reports/form-leads-conversion` |

## Detalhes Técnicos

### 1. Hook `useFormLeadsConversionReport`

Duas queries paralelas via `useQuery`:

- **Leads**: `form_submissions.select("id, created_at, form_id")` filtrado por período
- **Deals won**: `deals.select("id, closed_at, value").eq("lead_source", "formulario").eq("status", "won")` filtrado por `closed_at` no período
- **Deals lost**: mesma query com `status = 'lost'`

Agrupamento client-side por dia. Retorna:
- `dailyData: { date, leads, won, lost, conversionRate }[]`
- `kpis: { totalLeads, totalWon, totalLost, conversionRate, totalRevenue }`
- Filtro opcional por `form_id`

### 2. Hook `useExportFormLeadsExcel`

Usa `xlsx` (já instalado) para gerar planilha com colunas:
- Data | Leads Criados | Deals Ganhos | Deals Perdidos | Taxa Conversão (%) | Receita (R$)
- Linha de totais no final
- Nome do arquivo: `leads-vs-conversao-YYYY-MM-DD.xlsx`

### 3. Página `FormLeadsConversionReport`

Segue o padrão do `TicketsExportReport`:

- **Header**: botão voltar + título "Leads Formulário vs Conversão" + botão "Exportar Excel"
- **Filtros**: DateRange picker (default 30 dias) + Select de formulário específico (query em `forms`)
- **4 KPI Cards**: Total Leads | Deals Ganhos | Taxa Conversão | Receita Total
- **Tabela**: colunas Data | Leads | Ganhos | Perdidos | Conversão % | Receita — com paginação
- Loading skeletons e estado vazio

### 4. Reports.tsx — Novo card na aba Vendas

```
{
  id: 'form_leads_conversion',
  name: 'Leads Formulário vs Conversão',
  description: 'Comparativo de leads criados por formulário vs deals fechados (Excel)',
  icon: FileSpreadsheet,
  route: '/reports/form-leads-conversion',
}
```

### 5. App.tsx — Rota

Lazy import + rota protegida com `analytics.view`.

## Impacto

- Zero regressão: apenas adição de novos arquivos + 1 card na lista + 1 rota
- Usa padrões visuais já existentes (DatePickerWithRange, Card, Table, XLSX export)
- Biblioteca `xlsx` já está instalada no projeto

