-- Dropar política problemática que está bloqueando INSERT
DROP POLICY IF EXISTS "manage_own_canned_responses" ON public.canned_responses;

-- Criar política para INSERT (qualquer usuário autenticado pode criar)
CREATE POLICY "insert_own_canned_responses" ON public.canned_responses
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Criar política para UPDATE (apenas o próprio criador)
CREATE POLICY "update_own_canned_responses" ON public.canned_responses
FOR UPDATE 
USING (created_by = auth.uid());

-- Criar política para DELETE (apenas o próprio criador)
CREATE POLICY "delete_own_canned_responses" ON public.canned_responses
FOR DELETE 
USING (created_by = auth.uid());