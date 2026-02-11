
-- Politica segura: apenas internos (com cast correto)
CREATE POLICY "can_read_agent_departments_for_transfer"
ON public.agent_departments
FOR SELECT
TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY['admin','manager','general_manager',
          'support_manager','cs_manager','financial_manager']::app_role[]
  )
  OR
  EXISTS (
    SELECT 1 FROM public.role_permissions rp
    JOIN public.user_roles ur ON ur.role::text = rp.role::text
    WHERE ur.user_id = auth.uid()
      AND rp.permission_key = 'inbox.transfer'
      AND rp.enabled = true
  )
);
