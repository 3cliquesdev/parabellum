
-- =============================================
-- FIX: Permitir que role 'user' veja seus próprios deals
-- O problema: Membros do time comercial estão com role='user'
-- mas a política RLS só permite 'sales_rep' ver deals
-- =============================================

-- Atualizar política SELECT para incluir 'user' que pode ver seus próprios deals
DROP POLICY IF EXISTS "role_based_select_deals" ON public.deals;

CREATE POLICY "role_based_select_deals" ON public.deals
FOR SELECT
TO authenticated
USING (
  -- Roles com acesso total
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'general_manager'::app_role) OR
  -- sales_rep vê apenas seus deals
  (has_role(auth.uid(), 'sales_rep'::app_role) AND (assigned_to = auth.uid())) OR
  -- user (time comercial) também vê apenas seus deals atribuídos
  (has_role(auth.uid(), 'user'::app_role) AND (assigned_to = auth.uid()))
);

-- Atualizar política UPDATE para incluir 'user'
DROP POLICY IF EXISTS "role_based_update_deals" ON public.deals;

CREATE POLICY "role_based_update_deals" ON public.deals
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'general_manager'::app_role) OR
  (has_role(auth.uid(), 'sales_rep'::app_role) AND (assigned_to = auth.uid())) OR
  (has_role(auth.uid(), 'user'::app_role) AND (assigned_to = auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'general_manager'::app_role) OR
  (has_role(auth.uid(), 'sales_rep'::app_role) AND ((assigned_to = auth.uid()) OR (assigned_to IS NULL))) OR
  (has_role(auth.uid(), 'user'::app_role) AND ((assigned_to = auth.uid()) OR (assigned_to IS NULL)))
);

-- Atualizar política INSERT para incluir 'user'
DROP POLICY IF EXISTS "role_based_insert_deals" ON public.deals;

CREATE POLICY "role_based_insert_deals" ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'general_manager'::app_role) OR
  (has_role(auth.uid(), 'sales_rep'::app_role) AND ((assigned_to = auth.uid()) OR (assigned_to IS NULL))) OR
  (has_role(auth.uid(), 'user'::app_role) AND ((assigned_to = auth.uid()) OR (assigned_to IS NULL)))
);

-- Habilitar deals.view para role 'user' na tabela de permissões
UPDATE public.role_permissions
SET enabled = true, updated_at = now()
WHERE role = 'user'
  AND permission_key = 'deals.view';
