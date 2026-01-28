-- Expand conversation_status enum to support queue states used by the app
DO $$
BEGIN
  BEGIN
    ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'resolved' AFTER 'open';
  EXCEPTION WHEN duplicate_object THEN
    -- already exists
    NULL;
  END;

  BEGIN
    ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'waiting_human' AFTER 'closed';
  EXCEPTION WHEN duplicate_object THEN
    -- already exists
    NULL;
  END;
END $$;
