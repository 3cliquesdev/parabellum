-- ============================================================
-- PHASE 5B: Copilot Health Score RPCs
-- Agregated metrics for operational health (not individual agents)
-- ============================================================

-- ============================================================
-- RPC 1: Health Score Geral da Operação
-- ============================================================
CREATE OR REPLACE FUNCTION get_copilot_health_score(
  p_start_date TIMESTAMPTZ DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_DATE,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_conversations BIGINT,
  copilot_active_count BIGINT,
  copilot_adoption_rate NUMERIC,
  avg_resolution_time_with_copilot INTEGER,
  avg_resolution_time_without_copilot INTEGER,
  resolution_improvement_percent NUMERIC,
  avg_csat_with_copilot NUMERIC,
  avg_csat_without_copilot NUMERIC,
  csat_improvement_percent NUMERIC,
  kb_gap_count BIGINT,
  kb_coverage_rate NUMERIC,
  suggestions_used_total BIGINT,
  suggestions_available_total BIGINT,
  suggestion_usage_rate NUMERIC,
  health_score NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE m.copilot_active = true) as active,
      AVG(m.resolution_time_seconds) FILTER (WHERE m.copilot_active = true) as res_with,
      AVG(m.resolution_time_seconds) FILTER (WHERE m.copilot_active = false OR m.copilot_active IS NULL) as res_without,
      AVG(m.csat_rating::numeric) FILTER (WHERE m.copilot_active = true AND m.csat_rating IS NOT NULL) as csat_with,
      AVG(m.csat_rating::numeric) FILTER (WHERE (m.copilot_active = false OR m.copilot_active IS NULL) AND m.csat_rating IS NOT NULL) as csat_without,
      COUNT(*) FILTER (WHERE m.created_kb_gap = true) as gaps,
      SUM(COALESCE(m.suggestions_used, 0)) as used,
      SUM(COALESCE(m.suggestions_available, 0)) as available
    FROM agent_quality_metrics m
    LEFT JOIN conversations c ON m.conversation_id = c.id
    WHERE m.created_at BETWEEN p_start_date AND p_end_date
      AND (p_department_id IS NULL OR c.department = p_department_id::text)
  )
  SELECT
    metrics.total::BIGINT,
    metrics.active::BIGINT,
    ROUND(CASE WHEN metrics.total > 0 THEN (metrics.active::numeric / metrics.total) * 100 ELSE 0 END, 1),
    COALESCE(metrics.res_with, 0)::integer,
    COALESCE(metrics.res_without, 0)::integer,
    ROUND(CASE WHEN metrics.res_without > 0 THEN ((metrics.res_without - metrics.res_with) / metrics.res_without) * 100 ELSE 0 END, 1),
    ROUND(COALESCE(metrics.csat_with, 0), 2),
    ROUND(COALESCE(metrics.csat_without, 0), 2),
    ROUND(CASE WHEN metrics.csat_without > 0 THEN ((metrics.csat_with - metrics.csat_without) / metrics.csat_without) * 100 ELSE 0 END, 1),
    metrics.gaps::BIGINT,
    ROUND(CASE WHEN metrics.total > 0 THEN ((metrics.total - metrics.gaps)::numeric / metrics.total) * 100 ELSE 100 END, 1),
    metrics.used::BIGINT,
    metrics.available::BIGINT,
    ROUND(CASE WHEN metrics.available > 0 THEN (metrics.used::numeric / metrics.available) * 100 ELSE 0 END, 1),
    -- Health Score: média ponderada dos indicadores (0-100)
    ROUND(
      (
        COALESCE(CASE WHEN metrics.total > 0 THEN (metrics.active::numeric / metrics.total) * 100 ELSE 0 END, 0) * 0.25 +
        COALESCE(CASE WHEN metrics.total > 0 THEN ((metrics.total - metrics.gaps)::numeric / metrics.total) * 100 ELSE 100 END, 0) * 0.25 +
        COALESCE(metrics.csat_with * 20, 50) * 0.25 +
        COALESCE(CASE WHEN metrics.available > 0 THEN (metrics.used::numeric / metrics.available) * 100 ELSE 0 END, 0) * 0.25
      ), 0
    )
  FROM metrics;
END;
$$;

-- ============================================================
-- RPC 2: Evolução Mensal do Copilot
-- ============================================================
CREATE OR REPLACE FUNCTION get_copilot_monthly_evolution(
  p_months INTEGER DEFAULT 6,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
  month TEXT,
  month_date DATE,
  copilot_active_count BIGINT,
  total_conversations BIGINT,
  adoption_rate NUMERIC,
  avg_resolution_time INTEGER,
  avg_csat NUMERIC,
  kb_gaps_created BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', m.created_at), 'Mon/YYYY') as month,
    DATE_TRUNC('month', m.created_at)::DATE as month_date,
    COUNT(*) FILTER (WHERE m.copilot_active = true)::BIGINT,
    COUNT(*)::BIGINT,
    ROUND(COUNT(*) FILTER (WHERE m.copilot_active = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1),
    COALESCE(AVG(m.resolution_time_seconds)::integer, 0),
    ROUND(COALESCE(AVG(m.csat_rating::numeric), 0), 2),
    COUNT(*) FILTER (WHERE m.created_kb_gap = true)::BIGINT
  FROM agent_quality_metrics m
  LEFT JOIN conversations c ON m.conversation_id = c.id
  WHERE m.created_at >= (CURRENT_DATE - (p_months || ' months')::interval)
    AND (p_department_id IS NULL OR c.department = p_department_id::text)
  GROUP BY DATE_TRUNC('month', m.created_at)
  ORDER BY DATE_TRUNC('month', m.created_at);
END;
$$;

-- ============================================================
-- RPC 3: KB Gaps por Categoria (para identificar lacunas)
-- ============================================================
CREATE OR REPLACE FUNCTION get_kb_gaps_by_category(
  p_start_date TIMESTAMPTZ DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  category TEXT,
  gap_count BIGINT,
  total_conversations BIGINT,
  gap_rate NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(m.classification_label, 'Não classificado') as category,
    COUNT(*) FILTER (WHERE m.created_kb_gap = true)::BIGINT,
    COUNT(*)::BIGINT,
    ROUND(
      COUNT(*) FILTER (WHERE m.created_kb_gap = true)::numeric / NULLIF(COUNT(*), 0) * 100
    , 1)
  FROM agent_quality_metrics m
  WHERE m.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY COALESCE(m.classification_label, 'Não classificado')
  HAVING COUNT(*) FILTER (WHERE m.created_kb_gap = true) > 0
  ORDER BY COUNT(*) FILTER (WHERE m.created_kb_gap = true) DESC
  LIMIT 10;
END;
$$;

-- ============================================================
-- RPC 4: Comparativo Com IA vs Sem IA
-- ============================================================
CREATE OR REPLACE FUNCTION get_copilot_comparison(
  p_start_date TIMESTAMPTZ DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  group_label TEXT,
  total_conversations BIGINT,
  avg_resolution_seconds INTEGER,
  avg_csat NUMERIC,
  avg_suggestions_used NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Com Copilot'::text,
    COUNT(*)::BIGINT,
    COALESCE(AVG(resolution_time_seconds)::integer, 0),
    ROUND(COALESCE(AVG(csat_rating::numeric), 0), 2),
    ROUND(COALESCE(AVG(suggestions_used::numeric), 0), 1)
  FROM agent_quality_metrics
  WHERE created_at BETWEEN p_start_date AND p_end_date
    AND copilot_active = true
  UNION ALL
  SELECT
    'Sem Copilot'::text,
    COUNT(*)::BIGINT,
    COALESCE(AVG(resolution_time_seconds)::integer, 0),
    ROUND(COALESCE(AVG(csat_rating::numeric), 0), 2),
    0::numeric
  FROM agent_quality_metrics
  WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (copilot_active = false OR copilot_active IS NULL);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_copilot_health_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_copilot_monthly_evolution TO authenticated;
GRANT EXECUTE ON FUNCTION get_kb_gaps_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION get_copilot_comparison TO authenticated;