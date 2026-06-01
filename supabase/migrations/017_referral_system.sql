-- Sistema de Referral / Links de Captação da Agência
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS referred_by_agency_id uuid REFERENCES agencies(id),
  ADD COLUMN IF NOT EXISTS signup_source text DEFAULT 'direct';
  -- signup_source: 'direct', 'agency_link', 'invite'

CREATE TABLE IF NOT EXISTS agency_referral_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  slug        text NOT NULL UNIQUE,
  nome        text,
  clicks      int DEFAULT 0,
  conversions int DEFAULT 0,
  ativo       boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_links_agency ON agency_referral_links(agency_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_slug ON agency_referral_links(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_referred ON tenants(referred_by_agency_id);

ALTER TABLE agency_referral_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_links_agency" ON agency_referral_links
  FOR ALL TO authenticated
  USING ((SELECT is_super_admin()) OR agency_id IN (SELECT get_user_agency_ids()));
GRANT ALL ON agency_referral_links TO authenticated;

-- Link padrão para cada agência existente
INSERT INTO agency_referral_links (agency_id, slug, nome)
SELECT id, slug, 'Link principal' FROM agencies
ON CONFLICT (slug) DO NOTHING;
