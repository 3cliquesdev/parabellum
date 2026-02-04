-- =====================================================
-- MIGRAÇÃO DE EMERGÊNCIA V2: Tentar apenas o índice primeiro
-- =====================================================

-- Criar índice composto para acelerar verificações de role
CREATE INDEX IF NOT EXISTS idx_user_roles_uid_role 
ON public.user_roles(user_id, role);