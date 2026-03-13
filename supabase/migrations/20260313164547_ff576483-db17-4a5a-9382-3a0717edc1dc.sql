CREATE OR REPLACE FUNCTION public.get_support_metrics_filtered(
  p_start timestamptz,
  p_end timestamptz,
  p_department_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_frt numeric;
  v_mttr numeric;
  v_csat numeric;
  v_ratings int;
BEGIN
  -- AVG First Response Time (filtered)
  SELECT AVG(frt_minutes) INTO v_frt
  FROM (
    SELECT
      EXTRACT(EPOCH FROM (
        (SELECT MIN(m.created_at)
         FROM messages m
         WHERE m.conversation_id = cal.conversation_id
           AND m.sender_type = 'user'
           AND m.is_ai_generated = false
           AND m.is_internal = false
           AND m.created_at > cal.created_at
        ) - cal.created_at
      )) / 60.0 AS frt_minutes
    FROM (
      SELECT cal2.conversation_id, MIN(cal2.created_at) AS created_at
      FROM conversation_assignment_logs cal2
      INNER JOIN conversations conv ON conv.id = cal2.conversation_id
      WHERE cal2.created_at >= p_start AND cal2.created_at < p_end
        AND (p_department_id IS NULL OR conv.department = p_department_id)
        AND (p_agent_id IS NULL OR conv.assigned_to = p_agent_id)
      GROUP BY cal2.conversation_id
    ) cal
  ) sub
  WHERE frt_minutes IS NOT NULL AND frt_minutes > 0;

  -- AVG Resolution Time (filtered)
  SELECT AVG(resolution_minutes) INTO v_mttr
  FROM (
    SELECT
      EXTRACT(EPOCH FROM (c.closed_at - cal_assign.assigned_at)) / 60.0 AS resolution_minutes
    FROM conversations c
    INNER JOIN (
      SELECT conversation_id, MIN(created_at) AS assigned_at
      FROM conversation_assignment_logs
      WHERE assigned_to IS NOT NULL
      GROUP BY conversation_id
    ) cal_assign ON cal_assign.conversation_id = c.id
    WHERE c.closed_at IS NOT NULL
      AND c.closed_at >= p_start AND c.closed_at < p_end
      AND c.closed_at > cal_assign.assigned_at
      AND (p_department_id IS NULL OR c.department = p_department_id)
      AND (p_agent_id IS NULL OR c.assigned_to = p_agent_id)
  ) sub
  WHERE resolution_minutes IS NOT NULL AND resolution_minutes > 0;

  -- CSAT (filtered)
  SELECT COALESCE(AVG(cr.rating), 0), COUNT(*) INTO v_csat, v_ratings
  FROM conversation_ratings cr
  INNER JOIN conversations c ON c.id = cr.conversation_id
  WHERE cr.created_at >= p_start AND cr.created_at <= p_end
    AND (p_department_id IS NULL OR c.department = p_department_id)
    AND (p_agent_id IS NULL OR c.assigned_to = p_agent_id);

  RETURN json_build_object(
    'avgFRT', COALESCE(v_frt, 0),
    'avgMTTR', COALESCE(v_mttr, 0),
    'avgCSAT', COALESCE(v_csat, 0),
    'totalRatings', COALESCE(v_ratings, 0)
  );
END;
$$;