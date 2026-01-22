-- Corrigir política RLS para comentários em tickets
-- Problema: support_agent e financial_agent não conseguiam comentar em tickets de outros

-- Remover política antiga
DROP POLICY IF EXISTS "can_comment_on_accessible_tickets" ON public.ticket_comments;

-- Criar política corrigida - PERMISSIVA
-- Agentes podem comentar em qualquer ticket que conseguem visualizar
CREATE POLICY "can_comment_on_accessible_tickets"
ON public.ticket_comments
FOR INSERT
WITH CHECK (
  -- Admins e gerentes podem comentar em qualquer ticket
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'support_manager') OR
  has_role(auth.uid(), 'financial_manager') OR
  has_role(auth.uid(), 'general_manager') OR
  has_role(auth.uid(), 'cs_manager') OR
  
  -- Support agents e Financial agents podem comentar em qualquer ticket
  (
    (has_role(auth.uid(), 'support_agent') OR has_role(auth.uid(), 'financial_agent')) AND
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
    )
  )
);