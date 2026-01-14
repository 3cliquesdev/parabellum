-- PARTE 1: Corrigir RLS de contacts
DROP POLICY IF EXISTS role_based_select_contacts ON contacts;

CREATE POLICY "role_based_select_contacts" ON contacts
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'general_manager'::app_role) OR
  has_role(auth.uid(), 'cs_manager'::app_role) OR 
  has_role(auth.uid(), 'support_manager'::app_role) OR
  has_role(auth.uid(), 'financial_manager'::app_role) OR
  has_role(auth.uid(), 'financial_agent'::app_role) OR
  has_role(auth.uid(), 'support_agent'::app_role) OR
  (has_role(auth.uid(), 'sales_rep'::app_role) AND (
    assigned_to = auth.uid() OR 
    id IN (SELECT contact_id FROM deals WHERE assigned_to = auth.uid() AND contact_id IS NOT NULL) OR
    id IN (SELECT contact_id FROM conversations WHERE assigned_to = auth.uid())
  )) OR
  (has_role(auth.uid(), 'consultant'::app_role) AND consultant_id = auth.uid())
);