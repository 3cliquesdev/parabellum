-- Dropar política atual de INSERT em tickets
DROP POLICY IF EXISTS "authenticated_users_can_create_tickets" ON public.tickets;

-- Recriar política incluindo consultant e financial_agent
CREATE POLICY "authenticated_users_can_create_tickets" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'support_agent'::app_role) OR
    has_role(auth.uid(), 'support_manager'::app_role) OR
    has_role(auth.uid(), 'financial_manager'::app_role) OR
    has_role(auth.uid(), 'financial_agent'::app_role) OR
    has_role(auth.uid(), 'cs_manager'::app_role) OR
    has_role(auth.uid(), 'general_manager'::app_role) OR
    has_role(auth.uid(), 'sales_rep'::app_role) OR
    has_role(auth.uid(), 'consultant'::app_role)
  );