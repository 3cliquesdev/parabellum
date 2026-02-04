-- =============================================
-- LIMPEZA FINAL: Dropar policies com has_role() restantes
-- =============================================

-- CONVERSATIONS: INSERT e DELETE
DROP POLICY IF EXISTS role_based_delete_conversations_with_dept ON public.conversations;
DROP POLICY IF EXISTS role_based_insert_conversations_with_dept ON public.conversations;

-- TICKETS: ALL, DELETE, INSERT com has_role
DROP POLICY IF EXISTS admin_manager_full_access_tickets ON public.tickets;
DROP POLICY IF EXISTS financial_manager_can_manage_financial_tickets ON public.tickets;
DROP POLICY IF EXISTS support_manager_full_access_tickets ON public.tickets;
DROP POLICY IF EXISTS support_manager_can_delete_tickets ON public.tickets;
DROP POLICY IF EXISTS authenticated_users_can_create_tickets ON public.tickets;

-- =============================================
-- CRIAR POLICIES CANÔNICAS PARA INSERT/DELETE
-- =============================================

-- CONVERSATIONS INSERT: Managers e agentes podem criar
CREATE POLICY canonical_insert_conversations
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager','sales_rep','support_agent','financial_agent','consultant']::app_role[]
  )
);

-- CONVERSATIONS DELETE: Apenas managers
CREATE POLICY canonical_delete_conversations
ON public.conversations
FOR DELETE
TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
);

-- TICKETS INSERT: Qualquer authenticated pode criar
CREATE POLICY canonical_insert_tickets
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- TICKETS DELETE: Apenas managers
CREATE POLICY canonical_delete_tickets
ON public.tickets
FOR DELETE
TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager','support_manager','cs_manager','financial_manager']::app_role[]
  )
);