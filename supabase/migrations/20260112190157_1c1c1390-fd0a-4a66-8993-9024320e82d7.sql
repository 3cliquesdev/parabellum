-- Corrigir a policy de DELETE em project_card_comments
-- Problema: CASCADE de delete do card falha porque comentários de outros usuários
-- são bloqueados pela policy restritiva atual

-- Remover policy restritiva existente
DROP POLICY IF EXISTS "Comentários deletáveis pelo autor ou admin" ON project_card_comments;

-- Criar nova policy permissiva para DELETE
-- Permite que qualquer usuário autenticado delete comentários 
-- (necessário para CASCADE funcionar quando o card é deletado)
CREATE POLICY "Comentários deletáveis por autenticados" 
ON project_card_comments 
FOR DELETE 
TO authenticated
USING (true);