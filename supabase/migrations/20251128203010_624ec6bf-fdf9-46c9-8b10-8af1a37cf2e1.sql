-- Create scheduled_reports table for report automation
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  format TEXT DEFAULT 'csv' CHECK (format IN ('csv', 'pdf')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  hour INTEGER DEFAULT 8 CHECK (hour >= 0 AND hour <= 23),
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Users can manage their own scheduled reports
CREATE POLICY "users_can_manage_own_scheduled_reports"
ON scheduled_reports
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin/Manager can view all scheduled reports
CREATE POLICY "admin_manager_can_view_all_scheduled_reports"
ON scheduled_reports
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Index for CRON job queries
CREATE INDEX idx_scheduled_reports_active_frequency 
ON scheduled_reports(is_active, frequency, day_of_week, day_of_month, hour)
WHERE is_active = true;