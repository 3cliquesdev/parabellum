-- Política para vendedores verem tickets apenas dos seus contatos atribuídos
CREATE POLICY "sales_rep_can_view_tickets_of_assigned_contacts"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep'::app_role)
  AND customer_id IN (
    SELECT id FROM contacts 
    WHERE assigned_to = auth.uid()
  )
);