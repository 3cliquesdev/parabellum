
-- Fix FRT: tempo desde roteamento (assignment_logs) até primeira mensagem do agente humano
CREATE OR REPLACE FUNCTION get_avg_first_response_time(p_start timestamptz, p_end timestamptz)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  avg_minutes numeric;
BEGIN
  SELECT AVG(frt_minutes) INTO avg_minutes
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
      SELECT conversation_id, MIN(created_at) AS created_at
      FROM conversation_assignment_logs
      WHERE created_at >= p_start AND created_at < p_end
      GROUP BY conversation_id
    ) cal
  ) sub
  WHERE frt_minutes IS NOT NULL AND frt_minutes > 0;

  RETURN COALESCE(avg_minutes, 0);
END;
$$;

-- Fix MTTR: tempo desde agente assumir até encerramento
CREATE OR REPLACE FUNCTION get_avg_resolution_time(p_start timestamptz, p_end timestamptz)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  avg_minutes numeric;
BEGIN
  SELECT AVG(resolution_minutes) INTO avg_minutes
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
  ) sub
  WHERE resolution_minutes IS NOT NULL AND resolution_minutes > 0;

  RETURN COALESCE(avg_minutes, 0);
END;
$$;

-- New RPC: dashboard counts filtered by date
CREATE OR REPLACE FUNCTION get_support_dashboard_counts(p_start timestamptz, p_end timestamptz)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tickets_open int;
  v_conversations_open int;
  v_conversations_closed int;
  v_sla_risk int;
BEGIN
  -- Tickets created in period that are not resolved/closed
  SELECT COUNT(*) INTO v_tickets_open
  FROM tickets
  WHERE created_at >= p_start AND created_at < p_end
    AND status NOT IN ('resolved', 'closed');

  -- Conversations created in period
  SELECT COUNT(*) INTO v_conversations_open
  FROM conversations
  WHERE created_at >= p_start AND created_at < p_end
    AND status NOT IN ('closed', 'resolved');

  SELECT COUNT(*) INTO v_conversations_closed
  FROM conversations
  WHERE closed_at >= p_start AND closed_at < p_end;

  -- SLA at risk in period
  SELECT COUNT(*) INTO v_sla_risk
  FROM tickets
  WHERE created_at >= p_start AND created_at < p_end
    AND due_date IS NOT NULL
    AND due_date < now()
    AND status NOT IN ('resolved', 'closed');

  RETURN json_build_object(
    'tickets_open', COALESCE(v_tickets_open, 0),
    'conversations_open', COALESCE(v_conversations_open, 0),
    'conversations_closed', COALESCE(v_conversations_closed, 0),
    'sla_risk', COALESCE(v_sla_risk, 0)
  );
END;
$$;
