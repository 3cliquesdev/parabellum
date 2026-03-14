-- Fix RLS: message_buffer policies
CREATE POLICY "Service role full access on message_buffer"
  ON public.message_buffer FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read message_buffer"
  ON public.message_buffer FOR SELECT TO authenticated
  USING (true);

-- Fix RLS: conversation_dispatch_jobs - replace public with service_role
DROP POLICY IF EXISTS "Service role full access on dispatch_jobs" ON public.conversation_dispatch_jobs;

CREATE POLICY "Service role full access on dispatch_jobs"
  ON public.conversation_dispatch_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read dispatch_jobs"
  ON public.conversation_dispatch_jobs FOR SELECT TO authenticated
  USING (true);

-- Fix RLS: form_board_integrations - replace public with authenticated
DROP POLICY IF EXISTS "form_board_integrations_delete" ON public.form_board_integrations;
DROP POLICY IF EXISTS "form_board_integrations_insert" ON public.form_board_integrations;
DROP POLICY IF EXISTS "form_board_integrations_select" ON public.form_board_integrations;
DROP POLICY IF EXISTS "form_board_integrations_update" ON public.form_board_integrations;

CREATE POLICY "Authenticated users can manage form_board_integrations"
  ON public.form_board_integrations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);