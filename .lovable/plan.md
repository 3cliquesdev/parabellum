

# Plano Enterprise: Performance "Clicou, Entrou" em Todo o Sistema

## Resumo

Aplicar o padrao de performance ja implementado no Inbox (render-first, select minimo, prefetch, cancelamento) nas 3 rotas mais criticas: **Ticket Detail**, **Deals/Kanban** e **Dashboard Overview**. Tambem criar utilitarios compartilhados para padronizar prefetch e metricas de performance.

---

## Diagnostico Atual

### Problemas identificados por rota:

**1. Ticket Detail (`/support?ticket=X`)**
- `TicketDetail.tsx` bloqueia o render inteiro com `if (isLoading) return <Loader2>` -- tela vazia por 1-3s
- `TicketDetails.tsx` dispara 5+ queries simultaneas: `useUsers()` (todos!), `useActiveTicketStatuses()`, `useTicketPresence()`, `useSmartReply()`, `useUserRole()`
- `useTicketById` usa `select(*)` na tabela tickets (traz todas as colunas)
- `useTicketComments` faz 2 queries sequenciais (busca ticket + busca comments)
- Nenhum prefetch ao hover em lista de tickets

**2. Deals/Kanban (`/deals`)**
- `useDeals` usa `select(*)` nos deals (traz todas colunas incluindo description, metadata, etc.)
- KanbanCard abre DealDialog inline -- sem prefetch de dados do deal
- Nenhum staleTime configurado -- refetch desnecessario

**3. Dashboard Overview**
- `OverviewDashboardTab` dispara 8 queries independentes ao montar (fan-out)
- `useConversations` carrega TODAS as conversas abertas so para contar `.length` (poderia ser COUNT)
- `useSupportMetrics` faz 3 RPCs sequenciais (FRT + MTTR + CSAT)
- Cada tab do dashboard monta seus proprios hooks mesmo quando nao visivel (TabsContent renderiza lazy por padrao do Radix, ok)

---

## Entregas

### Entrega 1: Utilitarios Compartilhados

**Novo arquivo: `src/lib/prefetch.ts`**
- `createPrefetcher(queryKey, queryFn, staleTime)` -- factory para prefetch padronizado
- `usePrefetchOnHover(queryKey, queryFn)` -- hook reutilizavel com debounce 150ms e flag anti-repeticao
- `usePerformanceLog(routeName)` -- hook que loga tempo de mount-to-data-ready no console (dev) e pode ser expandido para telemetria

**Novo arquivo: `src/lib/select-fields.ts`**
- Centralizar strings de select minimo para tabelas frequentes (tickets, deals, contacts, profiles)
- Evitar `select(*)` em hooks de listagem

### Entrega 2: Ticket Detail -- Render-First

**`src/pages/TicketDetail.tsx`**
- Remover o `if (isLoading) return <Loader2>` que bloqueia tudo
- Renderizar header imediatamente com dados minimos (ticketId do URL)
- Passar ticket data para TicketDetails assim que disponivel; skeleton no corpo enquanto carrega

**`src/hooks/useTicketById.tsx`**
- Trocar `select(*)` por select minimo (apenas campos usados no render: id, ticket_number, subject, status, priority, created_at, customer_id, assigned_to, department_id, etc.)
- Manter os joins existentes (ja sao otimizados)
- Adicionar `staleTime: 60_000` e `abortSignal(signal)`

**`src/components/TicketDetails.tsx`**
- `useUsers()` carrega TODOS os usuarios -- trocar por lista filtrada ou lazy (so carregar quando abrir o Select de atribuicao)
- `useActiveTicketStatuses()` -- adicionar staleTime longo (statuses raramente mudam)

**`src/components/ConversationListItem.tsx` (tickets -- se existe lista de tickets)**
- Adicionar prefetch de ticket data no hover dos itens da lista de tickets (similar ao prefetchMessages)

### Entrega 3: Deals -- Select Minimo + Prefetch

**`src/hooks/useDeals.tsx`**
- Trocar `select(*)` nos deals por select minimo:
  ```
  id, title, value, status, stage_id, pipeline_id, contact_id, assigned_to,
  probability, expected_close_date, created_at, lost_reason, closed_at,
  contacts(id, first_name, last_name, email, phone, company),
  organizations(name),
  assigned_user:profiles!deals_assigned_to_fkey(id, full_name, avatar_url)
  ```
- Adicionar `staleTime: 30_000` (deals mudam com frequencia moderada)

**`src/components/KanbanCard.tsx`**
- Adicionar prefetch de deal detail no hover (se DealDialog faz queries extras)

### Entrega 4: Dashboard -- Reduzir Fan-Out

**`src/components/dashboard/OverviewDashboardTab.tsx`**
- `useConversations` so e usado para `.length` e `.filter(c => !c.assigned_to).length` -- trocar por uma query COUNT via RPC ou query simples:
  ```sql
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE assigned_to IS NULL) as queued
  FROM conversations WHERE status = 'open'
  ```
- Isso elimina carregar centenas de conversas so para contar

**`src/hooks/useSupportMetrics.tsx`**
- Combinar as 3 queries sequenciais (FRT + MTTR + CSAT) em 1 unica RPC:
  ```sql
  CREATE OR REPLACE FUNCTION get_support_metrics(p_start timestamptz, p_end timestamptz)
  RETURNS json AS $$ ... $$
  ```
- Reduz de 3 round-trips para 1

**Dashboard Tabs (Support, Financial, Sales, Operational)**
- Adicionar `staleTime: 5 * 60 * 1000` (5min) em todos os hooks de widget para evitar refetch ao trocar de tab e voltar

### Entrega 5: Metricas de Performance

**`src/lib/prefetch.ts` (usePerformanceLog)**
- No mount da pagina, registrar `performance.now()`
- Quando dados principais estiverem prontos (`!isLoading`), logar delta no console:
  ```
  [Perf] /support/ticket/abc → data ready in 342ms
  ```
- Adicionar nas 3 rotas refatoradas + Inbox

---

## Detalhes Tecnicos

### Select Minimo para Tickets
```typescript
export const TICKET_SELECT = `
  id, ticket_number, subject, description, status, priority,
  category, channel, created_at, updated_at, due_date,
  customer_id, assigned_to, created_by, department_id,
  requesting_department_id, origin_id, operation_id,
  related_conversation_id, related_ticket_id,
  merged_to_ticket_id, merged_to_ticket_number,
  approved_by, approved_at, rejection_reason,
  attachments, metadata,
  customer:contacts(id, first_name, last_name, email, phone, avatar_url, company),
  assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, avatar_url),
  created_by_user:profiles!tickets_created_by_fkey(id, full_name, avatar_url),
  department:departments!tickets_department_id_fkey(id, name, color),
  requesting_department:departments!tickets_requesting_department_id_fkey(id, name, color),
  operation:ticket_operations(id, name, color),
  origin:ticket_origins!tickets_origin_id_fkey(id, name, color)
`;
```

### Select Minimo para Deals
```typescript
export const DEAL_SELECT = `
  id, title, value, status, stage_id, pipeline_id, contact_id,
  organization_id, assigned_to, probability, expected_close_date,
  created_at, closed_at, lost_reason, lead_source,
  contacts(id, first_name, last_name, email, phone, company),
  organizations(name),
  assigned_user:profiles!deals_assigned_to_fkey(id, full_name, avatar_url)
`;
```

### RPC para Conversation Counts (nova)
```sql
CREATE OR REPLACE FUNCTION get_active_conversation_counts()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'queued', COUNT(*) FILTER (WHERE assigned_to IS NULL)
  )
  FROM conversations
  WHERE status = 'open';
$$;
```

### RPC para Support Metrics Consolidado (nova)
```sql
CREATE OR REPLACE FUNCTION get_support_metrics_consolidated(p_start timestamptz, p_end timestamptz)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_frt numeric;
  v_mttr numeric;
  v_csat numeric;
  v_ratings int;
BEGIN
  SELECT get_avg_first_response_time(p_start, p_end) INTO v_frt;
  SELECT get_avg_resolution_time(p_start, p_end) INTO v_mttr;
  SELECT AVG(rating), COUNT(*) INTO v_csat, v_ratings
    FROM conversation_ratings
    WHERE created_at BETWEEN p_start AND p_end;
  RETURN json_build_object(
    'avgFRT', COALESCE(v_frt, 0),
    'avgMTTR', COALESCE(v_mttr, 0),
    'avgCSAT', COALESCE(v_csat, 0),
    'totalRatings', COALESCE(v_ratings, 0)
  );
END;
$$;
```

---

## Arquivos Modificados

| Arquivo | Tipo | Mudanca |
|---|---|---|
| `src/lib/prefetch.ts` | NOVO | Helpers de prefetch e perf log |
| `src/lib/select-fields.ts` | NOVO | Constantes de select minimo |
| `src/pages/TicketDetail.tsx` | EDIT | Render-first (sem loading bloqueante) |
| `src/hooks/useTicketById.tsx` | EDIT | Select minimo + staleTime + signal |
| `src/components/TicketDetails.tsx` | EDIT | Lazy load de useUsers, staleTime em statuses |
| `src/hooks/useDeals.tsx` | EDIT | Select minimo + staleTime |
| `src/components/dashboard/OverviewDashboardTab.tsx` | EDIT | Trocar useConversations por RPC count |
| `src/hooks/useSupportMetrics.tsx` | EDIT | Usar RPC consolidada (1 call vs 3) |
| `src/hooks/useTicketComments.tsx` | EDIT | Receber customer_id/name como param (evitar query extra) |
| Migration SQL | NOVO | 2 RPCs: conversation counts + support metrics |

## Impacto e Riscos

- **Zero regressao**: nenhum comportamento existente muda; apenas otimizacao de queries e render
- **Rollback**: cada mudanca e independente; pode reverter arquivo por arquivo
- **Performance esperada**: Ticket Detail de ~3s para <500ms; Dashboard Overview de 8 queries para 4; Deals de select(*) para ~60% menos payload

