-- =============================================
-- LIMPEZA: Dropar policies canônicas existentes
-- =============================================
DROP POLICY IF EXISTS canonical_select_conversations ON public.conversations;
DROP POLICY IF EXISTS canonical_update_conversations ON public.conversations;
DROP POLICY IF EXISTS canonical_select_tickets ON public.tickets;
DROP POLICY IF EXISTS canonical_update_tickets ON public.tickets;

-- =============================================
-- FASE 2: CONSOLIDAR SELECT em conversations (6 → 2)
-- =============================================
DROP POLICY IF EXISTS financial_agent_can_view_assigned_conversations ON public.conversations;
DROP POLICY IF EXISTS sales_rep_can_view_sales_conversations ON public.conversations;
DROP POLICY IF EXISTS support_agent_can_view_assigned_conversations ON public.conversations;
DROP POLICY IF EXISTS user_can_view_department_conversations ON public.conversations;
DROP POLICY IF EXISTS optimized_select_conversations ON public.conversations;

CREATE POLICY canonical_select_conversations
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
  OR
  (assigned_to = auth.uid())
  OR
  (
    status = 'open'
    AND assigned_to IS NULL
    AND public.has_any_role(
      auth.uid(),
      ARRAY['sales_rep','support_agent','financial_agent','consultant']::app_role[]
    )
    AND department = (SELECT department FROM public.profiles WHERE id = auth.uid())
  )
  OR
  (
    status = 'open'
    AND assigned_to IS NULL
    AND department IS NULL
    AND public.has_any_role(
      auth.uid(),
      ARRAY['sales_rep','support_agent','financial_agent','consultant']::app_role[]
    )
  )
  OR
  (
    channel = 'web_chat'
    AND session_token IS NOT NULL
    AND session_token = (current_setting('request.headers', true)::json ->> 'x-session-token')
  )
);

-- =============================================
-- FASE 3: CONSOLIDAR SELECT em tickets (10 → 1)
-- =============================================
DROP POLICY IF EXISTS consultant_can_view_tickets ON public.tickets;
DROP POLICY IF EXISTS cs_manager_can_view_all_tickets ON public.tickets;
DROP POLICY IF EXISTS ecommerce_analyst_can_view_tickets ON public.tickets;
DROP POLICY IF EXISTS financial_agent_can_view_tickets ON public.tickets;
DROP POLICY IF EXISTS financial_managers_can_view_all_tickets ON public.tickets;
DROP POLICY IF EXISTS management_can_view_all_tickets ON public.tickets;
DROP POLICY IF EXISTS sales_rep_can_view_tickets ON public.tickets;
DROP POLICY IF EXISTS support_agent_can_view_tickets ON public.tickets;
DROP POLICY IF EXISTS support_manager_can_view_all_tickets ON public.tickets;
DROP POLICY IF EXISTS user_can_view_own_tickets ON public.tickets;

CREATE POLICY canonical_select_tickets
ON public.tickets
FOR SELECT
TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
  OR
  (assigned_to = auth.uid())
  OR
  (created_by = auth.uid())
  OR
  (
    public.has_any_role(
      auth.uid(),
      ARRAY['support_agent','financial_agent','ecommerce_analyst']::app_role[]
    )
    AND status = 'open'
    AND assigned_to IS NULL
    AND department_id = (SELECT department FROM public.profiles WHERE id = auth.uid())
  )
  OR
  (
    public.has_any_role(auth.uid(), ARRAY['sales_rep']::app_role[])
    AND customer_id IN (SELECT id FROM public.contacts WHERE assigned_to = auth.uid())
  )
  OR
  (
    public.has_any_role(auth.uid(), ARRAY['consultant']::app_role[])
    AND customer_id IN (SELECT get_consultant_contact_ids(auth.uid()))
  )
  OR
  (
    public.has_any_role(auth.uid(), ARRAY['user']::app_role[])
    AND created_by = auth.uid()
  )
);

-- =============================================
-- FASE 4: CONSOLIDAR UPDATE em conversations (5 → 2)
-- =============================================
DROP POLICY IF EXISTS cs_manager_can_update_conversations ON public.conversations;
DROP POLICY IF EXISTS financial_manager_can_update_conversations ON public.conversations;
DROP POLICY IF EXISTS general_manager_can_update_conversations ON public.conversations;
DROP POLICY IF EXISTS support_manager_can_update_all_conversations ON public.conversations;
DROP POLICY IF EXISTS agents_can_update_and_transfer_conversations ON public.conversations;

CREATE POLICY canonical_update_conversations
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
  OR
  (assigned_to = auth.uid())
)
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
  OR
  (assigned_to = auth.uid())
);

-- =============================================
-- FASE 5: CONSOLIDAR UPDATE em tickets (5 → 1)
-- =============================================
DROP POLICY IF EXISTS ecommerce_analyst_can_update_tickets ON public.tickets;
DROP POLICY IF EXISTS financial_agent_can_update_tickets ON public.tickets;
DROP POLICY IF EXISTS financial_managers_can_update_tickets ON public.tickets;
DROP POLICY IF EXISTS support_agent_can_update_tickets ON public.tickets;
DROP POLICY IF EXISTS support_manager_can_update_all_tickets ON public.tickets;

CREATE POLICY canonical_update_tickets
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
  OR
  (assigned_to = auth.uid())
  OR
  (created_by = auth.uid())
)
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
  OR
  (assigned_to = auth.uid())
  OR
  (created_by = auth.uid())
);

-- =============================================
-- FASE 6: ÍNDICES ADICIONAIS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tickets_created_by 
ON public.tickets(created_by);

CREATE INDEX IF NOT EXISTS idx_tickets_dept_assigned_status 
ON public.tickets(department_id, assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_conversations_dept_assigned_status 
ON public.conversations(department, assigned_to, status);

-- =============================================
-- FASE 7: RPC PARA HEALTH CHECK
-- =============================================
CREATE OR REPLACE FUNCTION public.audit_rls_health()
RETURNS TABLE (
  table_name text,
  total_policies int,
  has_role_policies int,
  select_policies int,
  update_policies int,
  insert_policies int,
  delete_policies int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tablename::text as table_name,
    count(*)::int as total_policies,
    sum(CASE WHEN qual ILIKE '%has_role%' OR with_check ILIKE '%has_role%' THEN 1 ELSE 0 END)::int as has_role_policies,
    sum(CASE WHEN cmd = 'SELECT' THEN 1 ELSE 0 END)::int as select_policies,
    sum(CASE WHEN cmd = 'UPDATE' THEN 1 ELSE 0 END)::int as update_policies,
    sum(CASE WHEN cmd = 'INSERT' THEN 1 ELSE 0 END)::int as insert_policies,
    sum(CASE WHEN cmd = 'DELETE' THEN 1 ELSE 0 END)::int as delete_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
  ORDER BY has_role_policies DESC, total_policies DESC;
$$;