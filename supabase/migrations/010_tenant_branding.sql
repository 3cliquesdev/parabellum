-- Branding por tenant (emails com identidade do cliente)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS logo_url      text,
  ADD COLUMN IF NOT EXISTS cor_primaria  text DEFAULT '#9aea62',
  ADD COLUMN IF NOT EXISTS white_label   boolean DEFAULT false;
