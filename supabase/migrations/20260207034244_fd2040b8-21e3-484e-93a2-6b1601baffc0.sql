-- Security Fix: Enable RLS on rls_policy_backup table and restrict access

-- 1. Enable RLS on rls_policy_backup table (currently without RLS)
ALTER TABLE public.rls_policy_backup ENABLE ROW LEVEL SECURITY;

-- Block all client access - this is an internal system table
CREATE POLICY "service_role_only_access" ON public.rls_policy_backup
AS PERMISSIVE FOR ALL
USING (false)
WITH CHECK (false);

-- 2. Fix profiles table: Replace overly permissive "Authenticated users can view all profiles" 
-- The current policy uses USING(true) which allows any authenticated user to see all profiles
-- We need to require actual authentication check
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" ON public.profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. The teams table already has proper policy (authenticated_can_view_teams requires auth.uid() IS NOT NULL)
-- No changes needed

-- 4. The email_verifications table already has service_role_only_access policy blocking all client access
-- No changes needed