-- Drop and recreate INSERT policy to force PostgREST refresh
-- Also add missing roles: consultant, cs_manager
DROP POLICY IF EXISTS "role_based_insert_deals" ON public.deals;

CREATE POLICY "role_based_insert_deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY[
        'admin'::app_role,
        'manager'::app_role,
        'general_manager'::app_role,
        'sales_rep'::app_role,
        'consultant'::app_role,
        'cs_manager'::app_role,
        'user'::app_role
      ])
  )
);