-- SMTP customizado por agência
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS smtp_host text,
  ADD COLUMN IF NOT EXISTS smtp_port int DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_user text,
  ADD COLUMN IF NOT EXISTS smtp_pass text,
  ADD COLUMN IF NOT EXISTS smtp_from text,
  ADD COLUMN IF NOT EXISTS smtp_from_name text;
