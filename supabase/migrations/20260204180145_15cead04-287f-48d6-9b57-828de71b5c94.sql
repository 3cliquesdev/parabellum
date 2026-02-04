-- Otimizar RLS inbox_view - Fase 1
DROP POLICY IF EXISTS "admin_manager_full_access_inbox_view" ON public.inbox_view;

CREATE POLICY "optimized_admin_manager_inbox" ON public.inbox_view
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'general_manager', 'support_manager', 'cs_manager', 'financial_manager')
  )
);