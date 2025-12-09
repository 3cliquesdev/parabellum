-- Corrigir política RLS de INSERT na tabela interactions
-- Permitir que admins/managers criem notas para QUALQUER contato

DROP POLICY IF EXISTS "interactions_insert_policy" ON public.interactions;

CREATE POLICY "interactions_insert_policy" ON public.interactions
FOR INSERT TO authenticated
WITH CHECK (
  -- Admins e managers podem inserir para qualquer contato
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role) OR
  public.has_role(auth.uid(), 'cs_manager'::app_role) OR
  public.has_role(auth.uid(), 'general_manager'::app_role) OR
  public.has_role(auth.uid(), 'support_manager'::app_role) OR
  public.has_role(auth.uid(), 'financial_manager'::app_role) OR
  public.has_role(auth.uid(), 'support_agent'::app_role) OR
  -- Sales rep mantém restrição por atribuição
  (public.has_role(auth.uid(), 'sales_rep'::app_role) AND 
    EXISTS (SELECT 1 FROM public.contacts WHERE id = customer_id AND assigned_to = auth.uid())) OR
  -- Consultant mantém restrição por carteira
  (public.has_role(auth.uid(), 'consultant'::app_role) AND 
    EXISTS (SELECT 1 FROM public.contacts WHERE id = customer_id AND consultant_id = auth.uid()))
);