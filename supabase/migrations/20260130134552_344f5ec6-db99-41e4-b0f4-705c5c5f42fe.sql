-- Adicionar permissão de UPDATE em departments para roles de gerência
-- Resolve: support_manager não conseguia alterar tempo de inatividade

-- Policy para UPDATE (INSERT/DELETE permanece apenas para admin)
CREATE POLICY "managers_can_update_departments" ON departments
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'support_manager')
  OR public.has_role(auth.uid(), 'cs_manager')
  OR public.has_role(auth.uid(), 'general_manager')
  OR public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'support_manager')
  OR public.has_role(auth.uid(), 'cs_manager')
  OR public.has_role(auth.uid(), 'general_manager')
  OR public.has_role(auth.uid(), 'manager')
);