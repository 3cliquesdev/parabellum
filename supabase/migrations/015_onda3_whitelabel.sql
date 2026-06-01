-- ONDA 3: White Label Completo
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS terms_url    text,
  ADD COLUMN IF NOT EXISTS privacy_url  text,
  ADD COLUMN IF NOT EXISTS docs_url     text,
  ADD COLUMN IF NOT EXISTS favicon_url  text;

-- Webhooks por agência (eventos dos tenants)
CREATE TABLE IF NOT EXISTS agency_webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  url         text NOT NULL,
  eventos     text[] NOT NULL DEFAULT '{}',
  ativo       boolean DEFAULT true,
  secret      text,
  ultimo_envio timestamptz,
  ultimo_erro text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_webhooks_agency ON agency_webhooks(agency_id);
ALTER TABLE agency_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_webhooks_isolation" ON agency_webhooks
  FOR ALL TO authenticated
  USING (
    (SELECT is_super_admin()) OR
    agency_id IN (SELECT get_user_agency_ids())
  );
GRANT ALL ON agency_webhooks TO authenticated;
