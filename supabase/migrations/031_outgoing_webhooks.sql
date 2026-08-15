-- Webhooks de saida (ex: n8n) — outro gap do 002-009 nunca versionado.
-- Referenciado por src/lib/webhooks.ts e /api/webhooks/outgoing*.
CREATE TABLE IF NOT EXISTS webhook_configs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  url          text NOT NULL,
  eventos      text[] NOT NULL DEFAULT '{}',
  ativo        boolean NOT NULL DEFAULT true,
  secret       text NOT NULL,
  ultimo_envio timestamptz,
  ultimo_erro  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_tenant ON webhook_configs(tenant_id);

ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_configs_tenant" ON webhook_configs;
CREATE POLICY "webhook_configs_tenant" ON webhook_configs
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON webhook_configs TO authenticated;
GRANT ALL ON webhook_configs TO service_role;

CREATE TABLE IF NOT EXISTS webhook_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id  uuid NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  evento      text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  status_code integer,
  sucesso     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id, created_at DESC);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_logs_tenant" ON webhook_logs;
CREATE POLICY "webhook_logs_tenant" ON webhook_logs
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT ON webhook_logs TO authenticated;
GRANT ALL ON webhook_logs TO service_role;
