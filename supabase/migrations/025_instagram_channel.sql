-- Instagram omnichannel config per tenant

CREATE TABLE IF NOT EXISTS instagram_configs (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  instagram_business_account_id text NOT NULL,
  access_token text NOT NULL,
  verify_token text NOT NULL DEFAULT 'liberty-instagram',
  username text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instagram_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instagram_configs_select_member" ON instagram_configs;
CREATE POLICY "instagram_configs_select_member" ON instagram_configs
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "instagram_configs_manage_admin" ON instagram_configs;
CREATE POLICY "instagram_configs_manage_admin" ON instagram_configs
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

GRANT ALL ON instagram_configs TO authenticated;

DROP TRIGGER IF EXISTS instagram_configs_updated_at ON instagram_configs;
CREATE TRIGGER instagram_configs_updated_at
  BEFORE UPDATE ON instagram_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
