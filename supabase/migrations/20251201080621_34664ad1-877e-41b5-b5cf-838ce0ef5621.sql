-- Adicionar RLS policies para sync_jobs (apenas admin/manager podem visualizar)
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- Admin e Manager podem ver todos os jobs
CREATE POLICY "admin_manager_view_all_sync_jobs"
ON sync_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager', 'general_manager')
  )
);

-- Usuários podem ver apenas seus próprios jobs
CREATE POLICY "users_view_own_sync_jobs"
ON sync_jobs
FOR SELECT
USING (created_by = auth.uid());

-- Apenas usuários autenticados podem criar jobs
CREATE POLICY "authenticated_create_sync_jobs"
ON sync_jobs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Service role pode atualizar qualquer job
CREATE POLICY "service_role_update_sync_jobs"
ON sync_jobs
FOR UPDATE
USING (auth.role() = 'service_role');