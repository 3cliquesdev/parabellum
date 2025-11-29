-- Permitir admin/manager visualizar todos os roles
CREATE POLICY "admins_managers_can_view_all_roles" 
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);