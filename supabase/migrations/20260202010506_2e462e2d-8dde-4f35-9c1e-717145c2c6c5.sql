-- =============================================
-- Dashboard de Suporte Enterprise V2
-- Migration: RPCs otimizadas + Indices + pg_trgm
-- =============================================

-- 1. Habilitar extensao pg_trgm para busca performatica
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- 2. RPC: get_support_metrics_v2
-- Calcula FRT e MTTR medios com filtros
-- =============================================
CREATE OR REPLACE FUNCTION get_support_metrics_v2(
  p_start timestamptz,
  p_end timestamptz,
  p_channel text DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  frt_avg_minutes numeric,
  mttr_avg_minutes numeric,
  frt_count bigint,
  mttr_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(
      CASE WHEN first_response_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60 
      END
    )::numeric as frt_avg_minutes,
    AVG(
      CASE WHEN resolved_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60 
      END
    )::numeric as mttr_avg_minutes,
    COUNT(*) FILTER (WHERE first_response_at IS NOT NULL)::bigint as frt_count,
    COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::bigint as mttr_count
  FROM tickets
  WHERE created_at >= p_start 
    AND created_at < p_end
    AND (p_channel IS NULL OR p_channel = 'all' OR channel = p_channel)
    AND (p_department_id IS NULL OR department_id = p_department_id)
    AND (p_agent_id IS NULL OR assigned_to = p_agent_id)
    AND (p_status IS NULL OR p_status = 'all' OR status::text = p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.get_support_metrics_v2(timestamptz, timestamptz, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_support_metrics_v2(timestamptz, timestamptz, text, uuid, uuid, text) TO authenticated;

-- =============================================
-- 3. RPC: get_sla_compliance_v2
-- Calcula SLA com 1 scan usando FILTER
-- =============================================
CREATE OR REPLACE FUNCTION get_sla_compliance_v2(
  p_start timestamptz,
  p_end timestamptz,
  p_channel text DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  on_time bigint,
  overdue bigint,
  pending bigint,
  total bigint,
  compliance_rate numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT *
    FROM tickets
    WHERE created_at >= p_start AND created_at < p_end
      AND due_date IS NOT NULL
      AND (p_channel IS NULL OR p_channel = 'all' OR channel = p_channel)
      AND (p_department_id IS NULL OR department_id = p_department_id)
      AND (p_agent_id IS NULL OR assigned_to = p_agent_id)
      AND (p_status IS NULL OR p_status = 'all' OR status::text = p_status)
  )
  SELECT
    COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= due_date) AS on_time,
    COUNT(*) FILTER (WHERE
      (resolved_at IS NOT NULL AND resolved_at > due_date)
      OR (resolved_at IS NULL AND due_date < now())
    ) AS overdue,
    COUNT(*) FILTER (WHERE resolved_at IS NULL AND due_date >= now()) AS pending,
    COUNT(*) AS total,
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= due_date))::numeric / COUNT(*)::numeric * 100
      ELSE 0
    END AS compliance_rate
  FROM base;
$$;

REVOKE ALL ON FUNCTION public.get_sla_compliance_v2(timestamptz, timestamptz, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sla_compliance_v2(timestamptz, timestamptz, text, uuid, uuid, text) TO authenticated;

-- =============================================
-- 4. RPC: get_volume_vs_resolution_v2
-- Volume diario de tickets abertos vs resolvidos
-- =============================================
CREATE OR REPLACE FUNCTION get_volume_vs_resolution_v2(
  p_start timestamptz,
  p_end timestamptz,
  p_channel text DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL
)
RETURNS TABLE(
  date_bucket date,
  opened bigint,
  resolved bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      p_start::date, 
      (p_end - interval '1 day')::date, 
      '1 day'::interval
    )::date as d
  ),
  opened_counts AS (
    SELECT created_at::date as d, COUNT(*) as cnt
    FROM tickets
    WHERE created_at >= p_start AND created_at < p_end
      AND (p_channel IS NULL OR p_channel = 'all' OR channel = p_channel)
      AND (p_department_id IS NULL OR department_id = p_department_id)
      AND (p_agent_id IS NULL OR assigned_to = p_agent_id)
    GROUP BY created_at::date
  ),
  resolved_counts AS (
    SELECT resolved_at::date as d, COUNT(*) as cnt
    FROM tickets
    WHERE resolved_at >= p_start AND resolved_at < p_end
      AND (p_channel IS NULL OR p_channel = 'all' OR channel = p_channel)
      AND (p_department_id IS NULL OR department_id = p_department_id)
      AND (p_agent_id IS NULL OR assigned_to = p_agent_id)
    GROUP BY resolved_at::date
  )
  SELECT 
    ds.d as date_bucket,
    COALESCE(o.cnt, 0)::bigint as opened,
    COALESCE(r.cnt, 0)::bigint as resolved
  FROM date_series ds
  LEFT JOIN opened_counts o ON o.d = ds.d
  LEFT JOIN resolved_counts r ON r.d = ds.d
  ORDER BY ds.d;
END;
$$;

REVOKE ALL ON FUNCTION public.get_volume_vs_resolution_v2(timestamptz, timestamptz, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_volume_vs_resolution_v2(timestamptz, timestamptz, text, uuid, uuid) TO authenticated;

-- =============================================
-- 5. RPC: get_support_drilldown_v2
-- Drilldown com paginacao, busca e ordenacao segura
-- CORRIGIDO: Usa first_name || last_name ao inves de name
-- =============================================
CREATE OR REPLACE FUNCTION get_support_drilldown_v2(
  p_start timestamptz,
  p_end timestamptz,
  p_metric text DEFAULT 'all',
  p_channel text DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'desc',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  ticket_number text,
  customer_name text,
  agent_name text,
  department_name text,
  channel text,
  status text,
  created_at timestamptz,
  first_response_at timestamptz,
  frt_minutes numeric,
  resolved_at timestamptz,
  mttr_minutes numeric,
  due_date timestamptz,
  sla_status text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sort_column text;
  v_sort_direction text;
  v_order_by text;
  v_search text;
BEGIN
  -- Normalizar p_search (defesa em profundidade)
  v_search := NULLIF(trim(COALESCE(p_search, '')), '');

  -- Allowlist para ORDER BY com trim(lower())
  v_sort_column := CASE lower(trim(p_sort_by))
    WHEN 'created_at' THEN 't.created_at'
    WHEN 'ticket_number' THEN 't.ticket_number'
    WHEN 'due_date' THEN 't.due_date'
    WHEN 'resolved_at' THEN 't.resolved_at'
    WHEN 'first_response_at' THEN 't.first_response_at'
    WHEN 'status' THEN 't.status::text'
    WHEN 'channel' THEN 't.channel'
    ELSE 't.created_at'
  END;

  v_sort_direction := CASE WHEN lower(trim(p_sort_dir)) = 'asc' THEN 'ASC' ELSE 'DESC' END;

  -- ORDER BY como string unica
  v_order_by := v_sort_column || ' ' || v_sort_direction || ' NULLS LAST, t.id DESC';

  RETURN QUERY EXECUTE format(
    $SQL$
    SELECT 
      t.id,
      t.ticket_number,
      COALESCE(c.first_name || ' ' || c.last_name, c.first_name, 'N/A') as customer_name,
      p.full_name as agent_name,
      d.name as department_name,
      t.channel,
      t.status::text,
      t.created_at,
      t.first_response_at,
      CASE WHEN t.first_response_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 60 
      END::numeric as frt_minutes,
      t.resolved_at,
      CASE WHEN t.resolved_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60 
      END::numeric as mttr_minutes,
      t.due_date,
      CASE 
        WHEN t.due_date IS NULL THEN NULL
        WHEN t.resolved_at IS NOT NULL AND t.resolved_at <= t.due_date THEN 'on_time'
        WHEN t.resolved_at IS NOT NULL AND t.resolved_at > t.due_date THEN 'overdue'
        WHEN t.resolved_at IS NULL AND t.due_date < now() THEN 'overdue'
        ELSE 'pending'
      END as sla_status,
      COUNT(*) OVER() as total_count
    FROM tickets t
    LEFT JOIN contacts c ON c.id = t.customer_id
    LEFT JOIN profiles p ON p.id = t.assigned_to
    LEFT JOIN departments d ON d.id = t.department_id
    WHERE t.created_at >= $1 AND t.created_at < $2
      AND ($3 IS NULL OR $3 = 'all' OR t.channel = $3)
      AND ($4 IS NULL OR t.department_id = $4)
      AND ($5 IS NULL OR t.assigned_to = $5)
      AND ($6 IS NULL OR $6 = 'all' OR t.status::text = $6)
      AND ($7 = 'all' 
        OR ($7 = 'frt' AND t.first_response_at IS NOT NULL)
        OR ($7 = 'mttr' AND t.resolved_at IS NOT NULL)
        OR ($7 = 'sla_overdue' AND t.due_date IS NOT NULL AND (
            (t.resolved_at IS NOT NULL AND t.resolved_at > t.due_date)
            OR (t.resolved_at IS NULL AND t.due_date < now())
          ))
        OR ($7 = 'sla_on_time' AND t.due_date IS NOT NULL AND t.resolved_at IS NOT NULL AND t.resolved_at <= t.due_date)
        OR ($7 = 'volume_opened')
        OR ($7 = 'volume_resolved' AND t.resolved_at IS NOT NULL)
      )
      AND ($8 IS NULL
        OR t.ticket_number ILIKE '%%' || $8 || '%%'
        OR t.id::text ILIKE '%%' || $8 || '%%'
        OR c.first_name ILIKE '%%' || $8 || '%%'
        OR c.last_name ILIKE '%%' || $8 || '%%'
      )
    ORDER BY %s
    LIMIT $9 OFFSET $10
    $SQL$,
    v_order_by
  )
  USING p_start, p_end, p_channel, p_department_id, p_agent_id, p_status, p_metric, v_search, p_limit, p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_support_drilldown_v2(
  timestamptz, timestamptz, text, text, uuid, uuid, text, text, text, text, int, int
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_support_drilldown_v2(
  timestamptz, timestamptz, text, text, uuid, uuid, text, text, text, text, int, int
) TO authenticated;

-- =============================================
-- 6. Indices otimizados para queries
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON tickets(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_first_response_at ON tickets(first_response_at) WHERE first_response_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_due_date ON tickets(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_dept_created ON tickets(department_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_agent_created ON tickets(assigned_to, created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_channel_created ON tickets(channel, created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_drilldown ON tickets(created_at DESC, id);

-- Indices TRGM para busca performatica
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number_trgm
  ON tickets USING gin (ticket_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_first_name_trgm
  ON contacts USING gin (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_last_name_trgm
  ON contacts USING gin (last_name gin_trgm_ops);