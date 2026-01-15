-- Create table to track user tour progress
CREATE TABLE IF NOT EXISTS public.tour_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tour_id text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tour_id)
);

-- Enable RLS
ALTER TABLE public.tour_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own tour progress
CREATE POLICY "Users can view own tour progress"
  ON public.tour_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own tour progress
CREATE POLICY "Users can insert own tour progress"
  ON public.tour_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own tour progress (to restart tours)
CREATE POLICY "Users can delete own tour progress"
  ON public.tour_progress
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());