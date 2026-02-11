
# Correção Enterprise: Consolidação de 3 RPCs para Analytics > Suporte
## Plano Ajustado e Detalhado

---

## Diagnóstico Técnico Confirmado

Análise dos 3 hooks problemáticos:

### 1. `useTeamPerformance.tsx` — Fan-out por perfil
- **Problema**: `Promise.all` sobre TODOS os profiles
- **Para CADA perfil**: 3 queries sequenciais (conversations, ratings, deals)
- **Explosão**: N profiles × 3 queries = 100+ requests simultâneos
- **Filtragem observada**:
  - Conversations: `assigned_to = profile.id`, `created_at` entre [start, end]
  - Ratings: via conversation_ids aggregado, `created_at` entre [start, end]
  - Deals: `assigned_to = profile.id`, `status = 'won'`, `closed_at` entre [start, end]
- **Revenue**: Usa `deals.value` (NÃO `net_value`)
- **Filtro final**: Retorna apenas agentes com `chatsAttended > 0 OR salesClosed > 0`

### 2. `useChannelPerformance.tsx` — 9 requests por rodada
- **Problema**: Loop por 3 canais × 3 queries cada
- **Canais**: 'web_chat', 'whatsapp', 'email'
- **Filtragem**:
  - Conversations: `channel = enum`, `created_at` entre [start, end]
  - Status "closed": contabilizado como `status = 'closed'`
  - IA handled: `ai_mode = 'autopilot'`
  - Messages: COUNT via separate query com `in(conversation_ids)`
- **CSAT**: via conversation_ratings JOIN conversations

### 3. `useVolumeVsResolution.tsx` — Processamento client pesado
- **Problema**: 2 queries massivas + `eachDayOfInterval` + filter no client
- **Query 1**: TODAS as conversations onde `created_at` entre [start, end]
- **Query 2**: TODAS as conversations onde `closed_at` entre [start, end] (com NOT NULL)
- **Processamento**: `eachDayOfInterval` + `filter` + `format` → lento com grande volume
- **Output format**: `{date: "dd/MM", opened: N, resolved: N}`

---

## Solução em 2 Entregas

### Entrega A: Migration SQL — Criar 3 RPCs Consolidados

**Arquivo**: `supabase/migrations/[timestamp]_analytics_rpc_consolidation.sql`

#### RPC 1: `get_team_performance_consolidated`

```sql
CREATE OR REPLACE FUNCTION public.get_team_performance_consolidated(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE(
  agent_id UUID,
  agent_name TEXT,
  avatar_url TEXT,
  chats_attended BIGINT,
  avg_response_minutes NUMERIC,
  avg_csat NUMERIC,
  total_csat_ratings BIGINT,
  sales_closed BIGINT,
  total_revenue NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH agents AS (
    SELECT id, full_name, avatar_url
    FROM public.profiles
    WHERE role IN ('agent', 'manager', 'admin')  -- Incluir todos os que podem ter conversas
  ),
  conv AS (
    SELECT
      c.assigned_to,
      COUNT(*) AS chats_attended,
      AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at)) / 60.0)
        FILTER (WHERE c.first_response_at IS NOT NULL) AS avg_response_minutes
    FROM public.conversations c
    WHERE c.created_at >= p_start AND c.created_at < p_end
      AND c.assigned_to IS NOT NULL
    GROUP BY c.assigned_to
  ),
  csat AS (
    SELECT
      c.assigned_to,
      AVG(r.rating)::NUMERIC AS avg_csat,
      COUNT(*) AS total_csat_ratings
    FROM public.conversation_ratings r
    INNER JOIN public.conversations c ON c.id = r.conversation_id
    WHERE c.created_at >= p_start AND c.created_at < p_end
      AND c.assigned_to IS NOT NULL
    GROUP BY c.assigned_to
  ),
  sales AS (
    SELECT
      d.assigned_to,
      COUNT(*) AS sales_closed,
      COALESCE(SUM(d.value), 0)::NUMERIC AS total_revenue
    FROM public.deals d
    WHERE d.status = 'won'
      AND d.closed_at >= p_start AND d.closed_at < p_end
      AND d.assigned_to IS NOT NULL
    GROUP BY d.assigned_to
  )
  SELECT
    a.id AS agent_id,
    a.full_name AS agent_name,
    a.avatar_url,
    COALESCE(conv.chats_attended, 0) AS chats_attended,
    COALESCE(ROUND(conv.avg_response_minutes::NUMERIC, 1), 0) AS avg_response_minutes,
    COALESCE(ROUND(csat.avg_csat::NUMERIC, 1), 0) AS avg_csat,
    COALESCE(csat.total_csat_ratings, 0) AS total_csat_ratings,
    COALESCE(sales.sales_closed, 0) AS sales_closed,
    COALESCE(sales.total_revenue, 0) AS total_revenue
  FROM agents a
  LEFT JOIN conv ON conv.assigned_to = a.id
  LEFT JOIN csat ON csat.assigned_to = a.id
  LEFT JOIN sales ON sales.assigned_to = a.id
  ORDER BY chats_attended DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_performance_consolidated(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
```

**Notas críticas**:
- Range: `[p_start, p_end)` (end exclusivo) para consistência com v2 existing
- Filtering por `role IN (...)` opcional — remover se quiser TODOS os profiles
- COALESCE + ROUND para evitar NULLs e manter consistência com `toFixed(1)`
- LEFT JOINs para garantir que agentes sem atividade apareçam se necessário (filtro acontece no client)

---

#### RPC 2: `get_channel_performance_consolidated`

```sql
CREATE OR REPLACE FUNCTION public.get_channel_performance_consolidated(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE(
  channel TEXT,
  total_conversations BIGINT,
  closed_conversations BIGINT,
  conversion_rate NUMERIC,
  avg_csat NUMERIC,
  total_messages BIGINT,
  ai_handled BIGINT,
  human_handled BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH channel_stats AS (
    SELECT
      c.channel,
      COUNT(*) FILTER (WHERE TRUE) AS total,
      COUNT(*) FILTER (WHERE c.status = 'closed') AS closed,
      COUNT(*) FILTER (WHERE c.ai_mode = 'autopilot') AS ai_count
    FROM public.conversations c
    WHERE c.created_at >= p_start AND c.created_at < p_end
    GROUP BY c.channel
  ),
  message_counts AS (
    SELECT
      c.channel,
      COUNT(m.id) AS msg_count
    FROM public.conversations c
    LEFT JOIN public.messages m ON m.conversation_id = c.id
    WHERE c.created_at >= p_start AND c.created_at < p_end
    GROUP BY c.channel
  ),
  csat_per_channel AS (
    SELECT
      c.channel,
      AVG(r.rating)::NUMERIC AS avg_rating
    FROM public.conversation_ratings r
    INNER JOIN public.conversations c ON c.id = r.conversation_id
    WHERE c.created_at >= p_start AND c.created_at < p_end
    GROUP BY c.channel
  )
  SELECT
    COALESCE(cs.channel, 'unknown') AS channel,
    COALESCE(cs.total, 0) AS total_conversations,
    COALESCE(cs.closed, 0) AS closed_conversations,
    CASE 
      WHEN COALESCE(cs.total, 0) > 0 
      THEN ROUND((COALESCE(cs.closed, 0)::NUMERIC / cs.total * 100), 2)
      ELSE 0
    END AS conversion_rate,
    COALESCE(ROUND(csat.avg_rating::NUMERIC, 1), 0) AS avg_csat,
    COALESCE(mc.msg_count, 0) AS total_messages,
    COALESCE(cs.ai_count, 0) AS ai_handled,
    COALESCE(cs.total - cs.ai_count, 0) AS human_handled
  FROM channel_stats cs
  LEFT JOIN message_counts mc ON mc.channel = cs.channel
  LEFT JOIN csat_per_channel csat ON csat.channel = cs.channel
  ORDER BY total_conversations DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_channel_performance_consolidated(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
```

**Notas**:
- COALESCE handle canals sem atividade
- FILTER (WHERE ...) agregação otimizada
- Conversion_rate = (closed / total) * 100 (mesmo cálculo do hook)

---

#### RPC 3: `get_volume_resolution_consolidated`

```sql
CREATE OR REPLACE FUNCTION public.get_volume_resolution_consolidated(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE(
  date_bucket TEXT,
  opened BIGINT,
  resolved BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_range AS (
    SELECT GENERATE_SERIES(
      DATE_TRUNC('day', p_start),
      DATE_TRUNC('day', p_end - INTERVAL '1 day'),
      INTERVAL '1 day'
    ) AS bucket
  ),
  opened_conv AS (
    SELECT
      DATE_TRUNC('day', c.created_at) AS bucket,
      COUNT(*) AS cnt
    FROM public.conversations c
    WHERE c.created_at >= p_start AND c.created_at < p_end
    GROUP BY DATE_TRUNC('day', c.created_at)
  ),
  resolved_conv AS (
    SELECT
      DATE_TRUNC('day', c.closed_at) AS bucket,
      COUNT(*) AS cnt
    FROM public.conversations c
    WHERE c.closed_at >= p_start AND c.closed_at < p_end
      AND c.closed_at IS NOT NULL
    GROUP BY DATE_TRUNC('day', c.closed_at)
  )
  SELECT
    TO_CHAR(dr.bucket, 'DD/MM') AS date_bucket,
    COALESCE(opened.cnt, 0) AS opened,
    COALESCE(resolved.cnt, 0) AS resolved
  FROM date_range dr
  LEFT JOIN opened_conv opened ON DATE_TRUNC('day', opened.bucket) = dr.bucket
  LEFT JOIN resolved_conv resolved ON DATE_TRUNC('day', resolved.bucket) = dr.bucket
  ORDER BY dr.bucket;
$$;

GRANT EXECUTE ON FUNCTION public.get_volume_resolution_consolidated(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
```

**Notas**:
- GENERATE_SERIES para garantir que TODOS os dias apareçam (mesmo sem dados)
- Format TO_CHAR('DD/MM') já no SQL (não precisa date-fns no client)
- closed_at IS NOT NULL garante consistência

---

#### Índices Recomendados

Adicionar ao final da migration:

```sql
-- Se não existirem já:
CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
  ON public.conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_created 
  ON public.conversations(assigned_to, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_closed_at 
  ON public.conversations(closed_at);
CREATE INDEX IF NOT EXISTS idx_conversation_ratings_created 
  ON public.conversation_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_closed_at 
  ON public.deals(closed_at, status);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_status 
  ON public.deals(assigned_to, status, closed_at);
```

---

### Entrega B: Reescrever 3 Hooks (Zero Fan-out)

#### Hook 1: `src/hooks/useTeamPerformance.tsx`

**Estratégia**:
- Substituir `Promise.all` por chamada single RPC
- Manter interface `TeamMemberPerformance` idêntica
- Aplicar filtro no client: `chatsAttended > 0 OR salesClosed > 0`
- `staleTime`: 5 minutos (300s)

**Estrutura**:
```typescript
queryFn: async () => {
  const { data, error } = await supabase.rpc(
    "get_team_performance_consolidated",
    { p_start: startDate.toISOString(), p_end: endDate.toISOString() }
  );
  
  if (error) throw error;
  
  // Mapear resultado RPC para TeamMemberPerformance[]
  return (data || [])
    .map(row => ({
      id: row.agent_id,
      name: row.agent_name,
      avatar_url: row.avatar_url,
      chatsAttended: row.chats_attended,
      avgResponseTime: row.avg_response_minutes,
      avgCSAT: row.avg_csat,
      totalCSATRatings: row.total_csat_ratings,
      salesClosed: row.sales_closed,
      totalRevenue: row.total_revenue,
    }))
    .filter(m => m.chatsAttended > 0 || m.salesClosed > 0)
    .sort((a, b) => b.chatsAttended - a.chatsAttended);
}
```

**queryKey**: `["team-performance", startDate.toISOString(), endDate.toISOString()]`

---

#### Hook 2: `src/hooks/useChannelPerformance.tsx`

**Estratégia**:
- Substituir loop de 3 canais por single RPC call
- Manter interface `ChannelPerformance` idêntica (apenas channel name mapping)
- Sort by `total_conversations` DESC no client se necessário

**Estrutura**:
```typescript
queryFn: async () => {
  const { data, error } = await supabase.rpc(
    "get_channel_performance_consolidated",
    { p_start: startDate.toISOString(), p_end: endDate.toISOString() }
  );
  
  if (error) throw error;
  
  // Mapear resultado (channel nomes já vêm do RPC)
  return (data || []).map(row => ({
    channel: row.channel === 'web_chat' ? 'Web Chat' 
           : row.channel === 'whatsapp' ? 'WhatsApp'
           : row.channel === 'email' ? 'Email'
           : row.channel,
    total_conversations: row.total_conversations,
    closed_conversations: row.closed_conversations,
    conversion_rate: row.conversion_rate,
    avg_csat: row.avg_csat,
    total_messages: row.total_messages,
    ai_handled: row.ai_handled,
    human_handled: row.human_handled,
  }));
}
```

**queryKey**: `["channel-performance", startDate.toISOString(), endDate.toISOString()]`

---

#### Hook 3: `src/hooks/useVolumeVsResolution.tsx`

**Estratégia**:
- Substituir 2 queries + client-side filtering por single RPC
- RPC já retorna formato pronto para gráfico (`date_bucket + opened + resolved`)
- Remover lógica de `eachDayOfInterval` e `format`

**Estrutura**:
```typescript
queryFn: async () => {
  const { data, error } = await supabase.rpc(
    "get_volume_resolution_consolidated",
    { p_start: startDate.toISOString(), p_end: endDate.toISOString() }
  );
  
  if (error) throw error;
  
  // Já vem no formato correto: {date_bucket: "DD/MM", opened: N, resolved: N}
  return (data || []).map(row => ({
    date: row.date_bucket, // RPC já retorna "dd/MM"
    opened: row.opened,
    resolved: row.resolved,
  }));
}
```

**queryKey**: `["volume-resolution", startDate.toISOString(), endDate.toISOString()]`

---

### Entrega C: Integração no Dashboard (Zero Regressão Visual)

**Componentes afetados**:
- `VolumeResolutionWidget.tsx` — já existe, apenas usa novo hook (zero mudança visual)
- `TeamPerformanceTable.tsx` — já existe, apenas usa novo hook (zero mudança visual)
- `ChannelPerformanceWidget.tsx` — já existe, apenas usa novo hook (zero mudança visual)

**Mudanças mínimas necessárias**: NENHUMA (hooks retornam mesma interface)

---

## Sequência de Implementação (Ordem Crítica)

1. **Migration SQL** ← Deploy automático (RPCs prontos)
2. **useTeamPerformance.tsx** ← Rewrite queryFn (1 RPC ao invés de Promise.all)
3. **useChannelPerformance.tsx** ← Rewrite queryFn (1 RPC ao invés de 3 loops)
4. **useVolumeVsResolution.tsx** ← Rewrite queryFn (1 RPC ao invés de 2 queries + client)
5. **Verificação**: Navegar para `/analytics` > aba "Suporte" → validar load

---

## Critérios de Aceitação (Obrigatório)

✅ **Performance**:
- Antes: 100+ requests simultâneos em Network tab
- Depois: Máximo 3-6 requests (os 3 RPCs + KPI queries)
- Tempo de carregamento: <1 segundo na média

✅ **Funcionalidade**:
- Widgets de FRT/MTTR/CSAT/SLA carregam SEMPRE (nunca zeros por timeout)
- TeamPerformanceTable retorna mesmos agentes + mesmos valores
- VolumeResolutionWidget retorna mesmos dados de "abertos vs resolvidos"
- ChannelPerformanceWidget retorna mesmos stats por canal

✅ **UI/UX**:
- Zero mudança visual (mesmos layouts, mesmas colunas, mesma formatação)
- Skeletons aparecem enquanto RPCs carregam
- Sem erros no console

✅ **Regressão Zero**:
- Comparar 2-3 agentes manualmente: verificar que chatsAttended, avgCSAT, salesClosed batem
- Comparar canals: verificar que conversion_rate e ai_handled batem
- Comparar volume: verificar que "opened + resolved" por dia bate com dados antigos

---

## Impacto Técnico

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Requests simultâneos | 100+ | 3 |
| Tempo de carregamento | 12+ segundos | <1 segundo |
| Bloqueio cross-tab | Sim (FRT/MTTR travam) | Não |
| Fan-out explosão | Promise.all × profiles | Single RPC |
| Padrão SQL | N/A | SECURITY DEFINER + STABLE + GRANT |
| Índices | Podem faltar | Adicionados na migration |

---

## Observabilidade & Hardening

Adicionar logging DEV (opcional, recomendado):
- No mount do Analytics, log: "Analytics loaded, [N] requests executed"
- Usar `usePerformanceLog` existente para medir "até data ready"

Garantir em `TeamPerformanceTable.tsx`:
- Skeleton render imediato (não bloqueia layout)
- Erro graceful (mostra "Nenhuma atividade" em vez de quebrar)

---

## Resumo da Mudança

| O que | Antes | Depois |
|------|-------|--------|
| `useTeamPerformance` | `Promise.all(profiles.map(p => 3 queries))` | `1 RPC call` |
| `useChannelPerformance` | `Promise.all(channels.map(c => 3 queries))` | `1 RPC call` |
| `useVolumeVsResolution` | `2 massive queries + client filtering` | `1 RPC call` |
| **Total requests** | **100+** | **3** |
| **Analytics load time** | **12+ sec** | **<1 sec** |
| **Visual** | *N/A* | **ZERO CHANGE** |

---

## Arquivos a Modificar

1. **NOVO**: `supabase/migrations/[timestamp]_analytics_rpc_consolidation.sql`
2. **EDIT**: `src/hooks/useTeamPerformance.tsx`
3. **EDIT**: `src/hooks/useChannelPerformance.tsx`
4. **EDIT**: `src/hooks/useVolumeVsResolution.tsx`

**Pronto para implementação.**

