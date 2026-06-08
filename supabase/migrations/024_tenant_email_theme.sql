-- Tema de email por tenant (preview + envio real)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS email_theme text NOT NULL DEFAULT 'dark'
  CHECK (email_theme IN ('dark', 'light'));
