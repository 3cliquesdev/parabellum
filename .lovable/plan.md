
# Plano: Criar "Relatório de Conversas" na Aba "Atendimento"

## Análise do Codebase Atual

### Estrutura de Relatórios
- **Menu central**: `src/pages/Reports.tsx` - define categorias e relatórios
- **Categoria "Atendimento"** (🎧): Contém 5 relatórios atualmente
  - Todos os Tickets
  - Relatório de Tickets (Excel) → rota `/reports/tickets-export`
  - Performance por Agente
  - Pesquisa CSAT
  - Conversas Comerciais → rota `/reports/commercial-conversations`

### Padrão Existente
**Relatório com rota própria** (como "Conversas Comerciais"):
1. Define em `Reports.tsx`: `{ route: '/reports/commercial-conversations', ... }`
2. Lazy import em `App.tsx`: `const CommercialConversationsReport = lazy(() => import("./pages/CommercialConversationsReport"))`
3. Rota em `App.tsx` (linha 210): `<Route path="/reports/commercial-conversations" ... >`
4. Arquivo de página: `src/pages/CommercialConversationsReport.tsx`

### Dados Disponíveis
- Hook `useCommercialConversationsReport` retorna exatamente os 20 campos solicitados:
  - short_id, status, contact_name/email/phone, created_at, closed_at, waiting_time_seconds, duration_seconds, assigned_agent_name, participants, department_name, interactions_count, origin, csat_score, ticket_id, tags_all, waiting_after_assignment_seconds, first_customer_message, total_count
- RPC otimizado: `get_commercial_conversations_report` (já consolidado na migração anterior)

## Solução: 3 Mudanças Simples

### Mudança 1: Adicionar Entrada no Menu (Reports.tsx)

**Localização**: Linha 70-77, categoria "support", após "commercial_conversations"

**Novo relatório**:
```json
{
  id: 'conversations_detailed',
  name: 'Relatório de Conversas',
  description: 'Lista detalhada de todas as conversas com filtros avançados e exportação CSV',
  icon: MessageSquare,
  route: '/reports/conversations',
}
```

**Por quê?**
- Padrão: relatórios com rota própria usam `route: '/reports/xxx'`
- Ícone: `MessageSquare` já é importado e usado em outras conversas
- Nome: único, diferencia de "Conversas Comerciais" (que tem filtro comercial + análise pivot)

---

### Mudança 2: Criar Página ConversationsReport.tsx

**Novo arquivo**: `src/pages/ConversationsReport.tsx` (~200 linhas)

**Estrutura**:
1. Header com botão "Voltar" (ArrowLeft) + ícone + título "Relatório de Conversas"
2. Filtros em flex row (similar ao CommercialConversationsReport):
   - DateRangePicker (default: mês atual)
   - Departamento (dropdown, default: todos)
   - Agente (dropdown, default: todos)
   - Status (open/closed, default: todos)
   - Canal (whatsapp/web_chat/instagram, default: todos)
   - Busca por cliente (text input)
3. Tabela única com 20 colunas (SEM abas como o comercial):
   - Reutiliza componente `CommercialDetailedTable` (que já exibe os 20 campos)
   - Ativa paginação (50 registros/página)
   - Botão "Exportar CSV" (usa `useExportCommercialConversationsCSV`)
4. Responsividade: scroll horizontal na tabela para mobile

**Hooks e componentes reutilizados**:
- `useCommercialConversationsReport` - retorna todos os dados necessários
- `useExportCommercialConversationsCSV` - exportação CSV
- `useDepartments`, `useProfiles` - dados para filtros
- `CommercialDetailedTable` - componente genérico de tabela
- `DateRangePicker`, `Select`, `Input` - componentes UI

**Diferença vs CommercialConversationsReport**:
| Aspecto | Conversas Comerciais | Relatório de Conversas |
|---------|---------------------|----------------------|
| Abas | Resumo + Completo | Apenas tabela detalhada |
| Filtro dept | Default: Comercial | Default: Todos |
| Análise pivot | Sim (resumo) | Não |
| Drilldown | Sim | Não |
| Tabela detalhada | Aba "Completo" | Sempre visível |
| Objetivo | Análise + drill-down | Lista e exportação |

**Estrutura de código**:
```typescript
// Imports
import { useState, useEffect, useMemo } from "react";
import { ... all UI components }
import { useCommercialConversationsReport } from "@/hooks/useCommercialConversationsReport";
import { useExportCommercialConversationsCSV } from "@/hooks/useExportCommercialConversationsCSV";
import { CommercialDetailedTable } from "@/components/reports/commercial/CommercialDetailedTable";

export default function ConversationsReport() {
  // State: filters, page, dateRange
  // Queries: useDepartments, useProfiles, useCommercialConversationsReport
  // Handlers: handleDateChange, handleFilter, handleExport, handlePageChange
  // Return: JSX com header, filtros, tabela
}
```

---

### Mudança 3: Adicionar Lazy Import e Rota (App.tsx)

**Lazy import** (linha ~123, após TicketsExportReport):
```typescript
const ConversationsReport = lazy(() => import("./pages/ConversationsReport"));
```

**Rota** (linha ~211, após `/reports/commercial-conversations`):
```typescript
<Route 
  path="/reports/conversations" 
  element={<ProtectedRoute requiredPermission="analytics.view">
    <Layout><ConversationsReport /></Layout>
  </ProtectedRoute>} 
/>
```

**Permissão**: `analytics.view` (mesma do "Conversas Comerciais" e relatórios gerais)

---

## Impacto

✅ **Zero regressão**: Novo relatório não afeta nada existente
✅ **Máxima reutilização**: Usa hooks, componentes e RPC otimizados
✅ **Performance**: Herda consolidação de RPCs da migração anterior
✅ **Padrão consistente**: Segue estrutura dos outros relatórios com rota
✅ **Funcionalidade completa**: Filtros + Paginação + Exportação CSV + 20 campos

## Sequência de Implementação

1. **Criar** `src/pages/ConversationsReport.tsx` (novo arquivo)
2. **Editar** `src/pages/Reports.tsx` - adicionar entrada no menu "support"
3. **Editar** `src/App.tsx` - adicionar lazy import + rota

## Critérios de Aceitação

✅ Menu de relatórios mostra "Relatório de Conversas" na aba "Atendimento"
✅ Clique abre página `/reports/conversations`
✅ Todos os 20 campos solicitados exibidos na tabela
✅ Filtros funcionam: data, departamento, agente, status, canal, busca
✅ Paginação funciona (50 por página)
✅ Botão "Exportar CSV" baixa arquivo com todos os campos
✅ Header com botão "Voltar" navega para `/reports`
✅ Responsivo (scroll horizontal na tabela em mobile)
✅ Sem erros no console
