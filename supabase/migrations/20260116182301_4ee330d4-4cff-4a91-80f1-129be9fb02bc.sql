-- Add tracking fields for rotten deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS became_rotten_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS rotten_notified_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS rotten_escalated_at TIMESTAMPTZ;

-- Create index for efficient rotten deals queries
CREATE INDEX IF NOT EXISTS idx_deals_rotten_tracking ON deals (status, updated_at, became_rotten_at) WHERE status = 'open';