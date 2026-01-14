-- Criar policy de UPDATE para financial_agent nos tickets
-- Permite atualizar tickets atribuídos a ela, não atribuídos, ou criados por ela

CREATE POLICY financial_agent_can_update_tickets ON tickets
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'financial_agent') 
    AND (
      assigned_to = auth.uid()
      OR assigned_to IS NULL
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'financial_agent')
  );