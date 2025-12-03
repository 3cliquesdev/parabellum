-- Fase 1: Atualizar política SELECT de contacts para permitir sales_rep ver todos
-- Necessário para: dropdown de DealDialog e info 360 nos cards do Kanban

-- Drop política existente
DROP POLICY IF EXISTS "role_based_select_contacts" ON contacts;

-- Recriar com permissão expandida para sales_rep (SELECT de todos)
CREATE POLICY "role_based_select_contacts" ON contacts FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'general_manager'::app_role) OR
  has_role(auth.uid(), 'sales_rep'::app_role)
);

-- NOTA: Políticas de UPDATE/DELETE permanecem inalteradas:
-- UPDATE: sales_rep só pode atualizar contatos atribuídos a ele
-- DELETE: apenas admin/manager/general_manager podem deletar