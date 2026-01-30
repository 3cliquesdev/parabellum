
-- Drop existing overly restrictive policies
DROP POLICY IF EXISTS "admin_manager_can_manage_conversation_tags" ON public.conversation_tags;
DROP POLICY IF EXISTS "support_agent_can_manage_conversation_tags" ON public.conversation_tags;
DROP POLICY IF EXISTS "sales_rep_can_manage_conversation_tags" ON public.conversation_tags;
DROP POLICY IF EXISTS "support_manager_can_manage_conversation_tags" ON public.conversation_tags;

-- Create a single comprehensive policy for ALL authenticated users to manage conversation tags
-- This follows the logic that anyone who can access a conversation should be able to tag it
CREATE POLICY "authenticated_can_manage_conversation_tags"
ON public.conversation_tags
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
