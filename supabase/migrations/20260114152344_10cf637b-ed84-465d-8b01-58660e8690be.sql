-- =====================================================
-- CORRIGIR VISIBILIDADE DE CONVERSAS ENCERRADAS
-- Agentes só devem ver conversas ABERTAS
-- =====================================================

-- PARTE 1: Atualizar RLS de inbox_view
DROP POLICY IF EXISTS support_agent_view_assigned_inbox ON inbox_view;

CREATE POLICY "support_agent_view_assigned_inbox" ON inbox_view
FOR SELECT USING (
  has_role(auth.uid(), 'support_agent'::app_role) AND (
    status = 'open' AND (
      assigned_to = auth.uid() OR 
      (assigned_to IS NULL AND department IN (
        SELECT id FROM departments WHERE name = 'Suporte'
      ))
    )
  )
);

DROP POLICY IF EXISTS sales_rep_view_sales_inbox ON inbox_view;

CREATE POLICY "sales_rep_view_sales_inbox" ON inbox_view
FOR SELECT USING (
  has_role(auth.uid(), 'sales_rep'::app_role) AND (
    status = 'open' AND (
      assigned_to = auth.uid() OR 
      (assigned_to IS NULL AND department IN (
        SELECT id FROM departments WHERE name IN ('Comercial', 'Vendas')
      ))
    )
  )
);

DROP POLICY IF EXISTS user_view_department_inbox ON inbox_view;

CREATE POLICY "user_view_department_inbox" ON inbox_view
FOR SELECT USING (
  has_role(auth.uid(), 'user'::app_role) AND (
    status = 'open' AND (
      assigned_to = auth.uid() OR 
      (assigned_to IS NULL AND department = (
        SELECT p.department::uuid FROM profiles p WHERE p.id = auth.uid()
      ))
    )
  )
);

-- PARTE 2: Atualizar RLS de conversations para consistência
DROP POLICY IF EXISTS support_agent_can_view_assigned_conversations ON conversations;

CREATE POLICY "support_agent_can_view_assigned_conversations" ON conversations
FOR SELECT USING (
  has_role(auth.uid(), 'support_agent'::app_role) AND (
    status = 'open' AND (
      assigned_to = auth.uid() OR 
      (assigned_to IS NULL AND department IN (
        SELECT id FROM departments WHERE name = 'Suporte'
      ))
    )
  )
);

DROP POLICY IF EXISTS sales_rep_can_view_sales_conversations ON conversations;

CREATE POLICY "sales_rep_can_view_sales_conversations" ON conversations
FOR SELECT USING (
  has_role(auth.uid(), 'sales_rep'::app_role) AND (
    status = 'open' AND (
      assigned_to = auth.uid() OR 
      (assigned_to IS NULL AND department IN (
        SELECT id FROM departments WHERE name IN ('Comercial', 'Vendas')
      ))
    )
  )
);

DROP POLICY IF EXISTS user_can_view_department_conversations ON conversations;

CREATE POLICY "user_can_view_department_conversations" ON conversations
FOR SELECT USING (
  has_role(auth.uid(), 'user'::app_role) AND (
    status = 'open' AND (
      assigned_to = auth.uid() OR 
      (department = (
        SELECT p.department::uuid FROM profiles p WHERE p.id = auth.uid()
      ))
    )
  )
);