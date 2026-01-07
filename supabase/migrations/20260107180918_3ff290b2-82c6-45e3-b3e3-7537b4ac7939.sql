-- Add 'none' value to form_target_type enum for neutral/collect-only forms
ALTER TYPE form_target_type ADD VALUE IF NOT EXISTS 'none';