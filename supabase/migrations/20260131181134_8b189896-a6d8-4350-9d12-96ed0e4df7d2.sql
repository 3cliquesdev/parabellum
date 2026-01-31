-- Criar função reutilizável para verificar se usuário é gerente ou admin
-- Será usada em policies RLS para alinhar backend com frontend
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager', 'general_manager', 'support_manager', 'cs_manager')
  );
$$;

-- Criar índice composto para performance em queries de roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role
ON public.user_roles (user_id, role);