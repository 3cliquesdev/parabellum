
-- Fix SELECT policy: allow agents to see messages from unassigned conversations in their department
DROP POLICY IF EXISTS "role_based_select_messages" ON messages;

CREATE POLICY "role_based_select_messages" ON messages FOR SELECT
TO authenticated
USING (
  is_manager_or_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND c.assigned_to = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND c.status = 'open'
      AND c.assigned_to IS NULL
      AND has_any_role(auth.uid(), ARRAY[
        'sales_rep','support_agent','financial_agent','consultant'
      ]::app_role[])
      AND (
        c.department = (SELECT p.department FROM profiles p WHERE p.id = auth.uid())
        OR c.department IS NULL
      )
  )
);

-- Fix UPDATE policy: allow agents to mark messages as read in unassigned conversations
DROP POLICY IF EXISTS "role_based_update_messages" ON messages;

CREATE POLICY "role_based_update_messages" ON messages FOR UPDATE
TO authenticated
USING (
  is_manager_or_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (
        c.assigned_to = auth.uid()
        OR (
          c.status = 'open'
          AND c.assigned_to IS NULL
          AND has_any_role(auth.uid(), ARRAY[
            'sales_rep','support_agent','financial_agent','consultant'
          ]::app_role[])
          AND (
            c.department = (SELECT p.department FROM profiles p WHERE p.id = auth.uid())
            OR c.department IS NULL
          )
        )
      )
  )
);
