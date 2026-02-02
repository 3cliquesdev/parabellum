-- =====================================================
-- RPCs Pivot e Drilldown + Índices de Performance
-- =====================================================

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

-- Conversas: filtros principais
CREATE INDEX IF NOT EXISTS idx_conversations_created_dept_status 
  ON conversations(created_at, department, status);

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_dept 
  ON conversations(assigned_to, department);

-- Conversation tags: anti-duplicidade (última tag)
CREATE INDEX IF NOT EXISTS idx_conversation_tags_conv_created_desc 
  ON conversation_tags(conversation_id, created_at DESC);

-- Tags: filtro por categoria
CREATE INDEX IF NOT EXISTS idx_tags_category 
  ON tags(category);

-- Assignment logs: primeira atribuição
CREATE INDEX IF NOT EXISTS idx_assignment_logs_conv_created 
  ON conversation_assignment_logs(conversation_id, created_at);

-- Tickets: último por conversa
CREATE INDEX IF NOT EXISTS idx_tickets_conv_created_desc 
  ON tickets(conversation_id, created_at DESC) 
  WHERE conversation_id IS NOT NULL;

-- Messages: primeira mensagem do cliente
CREATE INDEX IF NOT EXISTS idx_messages_conv_created_sender 
  ON messages(conversation_id, created_at, sender_type);

-- =====================================================
-- RPC: get_commercial_conversations_pivot
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_commercial_conversations_pivot(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_department_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL
)
RETURNS TABLE (
  department_id UUID,
  department_name TEXT,
  category_id UUID,
  category_name TEXT,
  category_color TEXT,
  total BIGINT
)
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
AS $$
  WITH latest_tag AS (
    SELECT DISTINCT ON (ct.conversation_id)
      ct.conversation_id,
      t.id AS category_id,
      t.name AS category_name,
      t.color AS category_color
    FROM conversation_tags ct
    JOIN tags t ON t.id = ct.tag_id AND t.category = 'conversation'
    ORDER BY ct.conversation_id, ct.created_at DESC
  )
  SELECT
    d.id AS department_id,
    COALESCE(d.name, 'Sem Departamento') AS department_name,
    lt.category_id,
    COALESCE(lt.category_name, 'Sem Tag') AS category_name,
    lt.category_color,
    COUNT(*) AS total
  FROM conversations c
  LEFT JOIN departments d ON d.id = c.department
  LEFT JOIN latest_tag lt ON lt.conversation_id = c.id
  WHERE c.created_at >= p_start
    AND c.created_at < p_end
    AND (p_department_id IS NULL OR c.department = p_department_id)
    AND (p_agent_id IS NULL OR c.assigned_to = p_agent_id)
    AND (p_status IS NULL OR c.status::TEXT = p_status)
    AND (p_channel IS NULL OR c.channel::TEXT = p_channel)
  GROUP BY d.id, d.name, lt.category_id, lt.category_name, lt.category_color
  ORDER BY d.name NULLS LAST, total DESC;
$$;

-- Security
REVOKE ALL ON FUNCTION public.get_commercial_conversations_pivot(
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_commercial_conversations_pivot(
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT
) TO authenticated;

-- =====================================================
-- RPC: get_commercial_conversations_drilldown
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_commercial_conversations_drilldown(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_department_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_no_tag BOOLEAN DEFAULT FALSE,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  conversation_id UUID,
  short_id TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  agent_name TEXT,
  department_name TEXT,
  category_name TEXT,
  category_color TEXT,
  status TEXT,
  channel TEXT,
  created_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
AS $$
  WITH latest_tag AS (
    SELECT DISTINCT ON (ct.conversation_id)
      ct.conversation_id,
      t.id AS category_id,
      t.name AS category_name,
      t.color AS category_color
    FROM conversation_tags ct
    JOIN tags t ON t.id = ct.tag_id AND t.category = 'conversation'
    ORDER BY ct.conversation_id, ct.created_at DESC
  )
  SELECT
    c.id AS conversation_id,
    LEFT(c.id::TEXT, 8) AS short_id,
    COALESCE(NULLIF(TRIM(COALESCE(co.first_name, '') || ' ' || COALESCE(co.last_name, '')), ''), co.phone, 'Sem nome') AS contact_name,
    co.phone AS contact_phone,
    p.full_name AS agent_name,
    d.name AS department_name,
    lt.category_name,
    lt.category_color,
    c.status::TEXT,
    c.channel::TEXT,
    c.created_at,
    c.closed_at,
    COUNT(*) OVER() AS total_count
  FROM conversations c
  JOIN contacts co ON co.id = c.contact_id
  LEFT JOIN profiles p ON p.id = c.assigned_to
  LEFT JOIN departments d ON d.id = c.department
  LEFT JOIN latest_tag lt ON lt.conversation_id = c.id
  WHERE c.created_at >= p_start
    AND c.created_at < p_end
    AND (p_department_id IS NULL OR c.department = p_department_id)
    AND (p_agent_id IS NULL OR c.assigned_to = p_agent_id)
    AND (p_status IS NULL OR c.status::TEXT = p_status)
    AND (p_channel IS NULL OR c.channel::TEXT = p_channel)
    AND (
      (p_category_id IS NULL AND NOT p_no_tag) OR 
      (p_no_tag AND lt.category_id IS NULL) OR
      (lt.category_id = p_category_id)
    )
    AND (p_search IS NULL OR 
         co.first_name ILIKE '%' || p_search || '%' OR 
         co.last_name ILIKE '%' || p_search || '%' OR
         co.phone ILIKE '%' || p_search || '%')
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Security
REVOKE ALL ON FUNCTION public.get_commercial_conversations_drilldown(
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, UUID, BOOLEAN, TEXT, INT, INT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_commercial_conversations_drilldown(
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, UUID, BOOLEAN, TEXT, INT, INT
) TO authenticated;