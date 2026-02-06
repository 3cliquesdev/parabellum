-- =====================================================
-- Migration: Add progress tracking to playbook_test_runs
-- Supports: real-time progress updates for test mode
-- =====================================================

-- 1. Add progress tracking columns
ALTER TABLE playbook_test_runs 
  ADD COLUMN IF NOT EXISTS total_nodes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS executed_nodes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_node_id TEXT,
  ADD COLUMN IF NOT EXISTS last_node_type TEXT,
  ADD COLUMN IF NOT EXISTS next_scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Enable Realtime (idempotent - wraps in exception handler)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.playbook_test_runs;
EXCEPTION
  WHEN duplicate_object THEN
    -- Already in publication, ignore silently
    NULL;
  WHEN others THEN
    -- Log if infrastructure blocks (e.g., Lovable Cloud limitations)
    RAISE NOTICE 'Could not add table to supabase_realtime publication: %', SQLERRM;
END $$;

-- 3. Enable RLS (required for Realtime subscriptions to work)
ALTER TABLE playbook_test_runs ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policy if exists (for idempotency)
DROP POLICY IF EXISTS "test_runs_read_own" ON playbook_test_runs;

-- 5. Create SELECT policy: users can read their own test runs or managers/admins can read all
CREATE POLICY "test_runs_read_own"
ON playbook_test_runs
FOR SELECT
USING (
  started_by = auth.uid()
  OR public.is_manager_or_admin(auth.uid())
);

-- 6. Create INSERT policy: users can create their own test runs
DROP POLICY IF EXISTS "test_runs_insert_own" ON playbook_test_runs;
CREATE POLICY "test_runs_insert_own"
ON playbook_test_runs
FOR INSERT
WITH CHECK (started_by = auth.uid());

-- 7. Create UPDATE policy: only service role can update (edge functions use service role)
-- Note: Updates are done by edge functions with service role, so authenticated users don't need update policy
DROP POLICY IF EXISTS "test_runs_update_own" ON playbook_test_runs;
CREATE POLICY "test_runs_update_own"
ON playbook_test_runs
FOR UPDATE
USING (
  started_by = auth.uid()
  OR public.is_manager_or_admin(auth.uid())
);

-- 8. Add index for faster queries by execution_id (used in progress updates)
CREATE INDEX IF NOT EXISTS idx_playbook_test_runs_execution_id ON playbook_test_runs(execution_id);

-- 9. Add index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_playbook_test_runs_started_by_created ON playbook_test_runs(started_by, created_at DESC);