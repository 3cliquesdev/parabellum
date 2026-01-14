-- PARTE 2: Corrigir RLS de conversations para permitir transferência
DROP POLICY IF EXISTS support_agent_can_update_assigned_conversations ON conversations;

CREATE POLICY "support_agent_can_update_assigned_conversations" ON conversations
FOR UPDATE USING (
  has_role(auth.uid(), 'support_agent'::app_role) AND (
    assigned_to = auth.uid() OR 
    (assigned_to IS NULL AND department IN (
      SELECT id FROM departments WHERE name = 'Suporte'
    ))
  )
) WITH CHECK (has_role(auth.uid(), 'support_agent'::app_role));

DROP POLICY IF EXISTS sales_rep_can_update_assigned_conversations ON conversations;

CREATE POLICY "sales_rep_can_update_assigned_conversations" ON conversations
FOR UPDATE USING (
  has_role(auth.uid(), 'sales_rep'::app_role) AND (
    assigned_to = auth.uid() OR 
    (assigned_to IS NULL AND department IN (
      SELECT id FROM departments WHERE name IN ('Comercial', 'Vendas')
    ))
  )
) WITH CHECK (has_role(auth.uid(), 'sales_rep'::app_role));

-- PARTE 3: Corrigir RLS de interactions para permitir log de transferência
DROP POLICY IF EXISTS interactions_insert_policy ON interactions;

CREATE POLICY "interactions_insert_policy" ON interactions
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'cs_manager'::app_role) OR 
  has_role(auth.uid(), 'general_manager'::app_role) OR
  has_role(auth.uid(), 'support_manager'::app_role) OR
  has_role(auth.uid(), 'financial_manager'::app_role) OR
  has_role(auth.uid(), 'support_agent'::app_role) OR
  (has_role(auth.uid(), 'sales_rep'::app_role) AND (
    EXISTS (SELECT 1 FROM contacts WHERE id = interactions.customer_id AND assigned_to = auth.uid()) OR
    EXISTS (SELECT 1 FROM conversations WHERE contact_id = interactions.customer_id AND assigned_to = auth.uid())
  )) OR
  (has_role(auth.uid(), 'consultant'::app_role) AND 
    EXISTS (SELECT 1 FROM contacts WHERE id = interactions.customer_id AND consultant_id = auth.uid()))
);