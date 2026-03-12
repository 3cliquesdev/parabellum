

# Unificação de Dashboards e Painéis

## Problema Atual — Fragmentação

O sistema tem **9+ telas** com sobreposição de funcionalidade:

| Tela | Rota | O que faz | Sobreposição |
|------|------|-----------|--------------|
| **Dashboard** (home) | `/` | Tabs: Overview, Vendas, Suporte, Financeiro, Operacional | Hub principal admin |
| **Analytics Hub** | `/analytics` | Cards de navegação para sub-dashboards | Intermediário desnecessário |
| **Analytics Premium** | `/analytics/premium` | Tabs: Overview, Vendas/Assinaturas, Churn, Performance, Suporte, Avançado | **Duplica** Dashboard home |
| **Dashboards Dinâmicos** | `/dashboards` | Lista de dashboards customizados | Funcionalidade própria |
| **Dashboard View** | `/dashboard/:id` | Visualizar dashboard dinâmico | Funcionalidade própria |
| **Gestão de Vendas** | `/sales-management` | KPIs + métricas de vendas | **Duplica** tab Vendas |
| **Dashboard CS** | `/cs-management` | Métricas CS | **Duplica** tab Overview |
| **Dashboard Suporte** | `/support-dashboard` | Métricas de suporte | **Duplica** tab Suporte |
| **AI Telemetria** | `/ai-telemetry` | Telemetria AI decisions | Funcionalidade própria |

## Proposta de Unificação

### Estrutura final — 3 níveis claros

```text
SIDEBAR "Visão Geral"
├── Dashboard (/)           ← Hub único com todas as tabs
├── Dashboards Dinâmicos    ← Painéis customizáveis (mantém)
└── Assinaturas             ← Mantém separado

SIDEBAR "Inbox & Suporte"
├── ... (sem "Dashboard Suporte" — tab no Dashboard principal)

SIDEBAR "Vendas"
├── ... (sem "Gestão de Vendas" separada — tab no Dashboard principal)
```

### Mudanças concretas

**1. Eliminar Analytics Hub (`/analytics`)** 
- Redirecionar `/analytics` → `/` (Dashboard principal)
- Mover link do Report Builder e Dashboards Dinâmicos direto para sidebar

**2. Absorver Analytics Premium no Dashboard principal**
- Mesclar as tabs do Premium (Churn, Performance, Avançado) como tabs adicionais no Dashboard `/`
- O Dashboard principal fica com: Overview, Vendas, Suporte, Financeiro, Operacional, Churn, Performance, Avançado
- Ou agrupar melhor: Overview | Vendas & Pipeline | Suporte | Financeiro & Churn | Performance | Avançado

**3. Eliminar rotas redundantes do sidebar**
- Remover "Dashboard Suporte" (`/support-dashboard`) — conteúdo já na tab Suporte
- Remover "Dashboard CS" (`/cs-management`) — conteúdo já na tab Overview
- Remover "Gestão de Vendas" (`/sales-management`) — conteúdo já na tab Vendas
- Remover "Analytics" (`/analytics`) — hub intermediário eliminado

**4. Manter rotas como redirects (backward compat)**
- `/analytics` → redirect `/`
- `/analytics/premium` → redirect `/?tab=overview`
- `/support-dashboard` → redirect `/?tab=support`
- `/cs-management` → redirect `/?tab=overview`
- `/sales-management` → redirect `/?tab=sales`

**5. Sidebar simplificada**

```text
Visão Geral
  ├── Dashboard           (/)
  ├── Painéis Dinâmicos   (/dashboards)
  ├── Assinaturas         (/subscriptions)
  └── Report Builder      (/report-builder)
```

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/config/routes.ts` | Remover 4 itens, mover Report Builder para "Visão Geral" |
| `src/pages/Dashboard.tsx` | Adicionar tabs: Churn, Performance, Avançado (do Premium) |
| `src/pages/Analytics.tsx` | Substituir por redirect para `/` |
| `src/pages/AnalyticsPremium.tsx` | Pode ser removido (conteúdo absorvido) |
| `src/pages/SupportDashboard.tsx` | Substituir por redirect `/?tab=support` |
| `src/pages/CSManagement.tsx` | Substituir por redirect `/?tab=overview` |
| `src/pages/SalesManagement.tsx` | Substituir por redirect `/?tab=sales` |
| `src/App.tsx` | Atualizar rotas com redirects |

### O que NÃO muda
- Dashboard do vendedor (sales_rep) — continua com Bento Grid pessoal
- Dashboards Dinâmicos (`/dashboards`, `/dashboard/:id`) — funcionalidade única
- AI Telemetria — funcionalidade única
- Copilot Impact, KB Gaps, Agent Quality — dashboards especializados mantidos

