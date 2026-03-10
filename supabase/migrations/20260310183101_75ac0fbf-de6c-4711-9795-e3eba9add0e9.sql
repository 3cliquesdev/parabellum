
-- Add slow response alert columns to departments
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS slow_response_alert_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slow_response_alert_minutes INTEGER NULL,
  ADD COLUMN IF NOT EXISTS slow_response_alert_tag_id UUID NULL REFERENCES public.tags(id);

-- Create protected_conversation_tags table
CREATE TABLE IF NOT EXISTS public.protected_conversation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.protected_conversation_tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read protected tags (to check before removing)
CREATE POLICY "Authenticated users can read protected tags"
  ON public.protected_conversation_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/delete (via edge functions)
CREATE POLICY "Service role can manage protected tags"
  ON public.protected_conversation_tags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
