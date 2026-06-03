-- =====================================================
-- Liberty CRM — ONDA 2: Quotas, Billing, Auditoria
-- =====================================================

-- =====================================================
-- 1. PLANOS DE AGÊNCIA (definição dos limites)
-- =====================================================
CREATE TABLE IF NOT EXISTS agency_plans (
  id                       text PRIMARY KEY,
  display_name             text NOT NULL,
  price_brl                numeric(10,2) NOT NULL DEFAULT 0,
  max_tenants              int NOT NULL DEFAULT 5,
  max_users_per_tenant     int NOT NULL DEFAULT 5,
  max_messages_per_month   int NOT NULL DEFAULT 50000,
  max_ai_calls_per_month   int NOT NULL DEFAULT 10000,
  max_storage_gb           numeric(10,2) NOT NULL DEFAULT 5
);

INSERT INTO agency_plans VALUES
  ('starter',    'Starter',    497.00,  5,   5,  50000,  10000, 5),
  ('growth',     'Growth',    1497.00,  20,  10, 250000,  50000, 25),
  ('scale',      'Scale',     2997.00,  50,  25, 1000000, 200000, 100),
  ('enterprise', 'Enterprise',    0,   999, 999, 9999999, 9999999, 9999)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. LIMITES E USO POR TENANT
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_limits (
  tenant_id                uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  max_users                int DEFAULT 5,
  max_messages_per_month   int DEFAULT 50000,
  max_ai_calls_per_month   int DEFAULT 10000,

  -- Uso corrente (atualizado em tempo real)
  messages_this_month      int DEFAULT 0,
  ai_calls_this_month      int DEFAULT 0,
  storage_used_gb          numeric(10,2) DEFAULT 0,

  reset_at                 timestamptz DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at               timestamptz DEFAULT now()
);

ALTER TABLE tenant_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_limits_multi" ON tenant_limits;
CREATE POLICY "tenant_limits_multi" ON tenant_limits
  FOR ALL TO authenticated
  USING (
    (SELECT is_super_admin()) OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids())
  );
GRANT ALL ON tenant_limits TO authenticated;

-- =====================================================
-- 3. BILLING DA AGÊNCIA
-- =====================================================
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS payment_status      text DEFAULT 'trial' CHECK (payment_status IN ('trial','active','past_due','cancelled')),
  ADD COLUMN IF NOT EXISTS payment_provider    text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS payment_customer_id text,
  ADD COLUMN IF NOT EXISTS payment_sub_id      text,
  ADD COLUMN IF NOT EXISTS trial_ends_at       timestamptz DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS next_billing_date   date,
  ADD COLUMN IF NOT EXISTS billing_email       text;

-- =====================================================
-- 4. AUDITORIA
-- =====================================================
CREATE TABLE IF NOT EXISTS agency_audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id),
  action        text NOT NULL,        -- ex: 'tenant.created', 'login_as', 'branding.updated'
  entity_type   text,                 -- ex: 'tenant', 'agency_user', 'domain'
  entity_id     uuid,
  details       jsonb DEFAULT '{}',
  ip_address    text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_agency ON agency_audit_logs(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON agency_audit_logs(user_id);

ALTER TABLE agency_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_agency" ON agency_audit_logs;
CREATE POLICY "audit_logs_agency" ON agency_audit_logs
  FOR ALL TO authenticated
  USING (
    (SELECT is_super_admin()) OR
    agency_id IN (SELECT get_user_agency_ids())
  );
GRANT ALL ON agency_audit_logs TO authenticated;

-- =====================================================
-- 5. FUNÇÃO: inicializar limites do tenant
-- =====================================================
CREATE OR REPLACE FUNCTION init_tenant_limits(p_tenant_id uuid, p_agency_id uuid)
RETURNS void AS $$
DECLARE
  v_plan text;
  v_max_msgs int; v_max_ai int;
BEGIN
  SELECT a.plan INTO v_plan FROM agencies a WHERE a.id = p_agency_id;
  SELECT max_messages_per_month, max_ai_calls_per_month
  INTO v_max_msgs, v_max_ai
  FROM agency_plans WHERE id = COALESCE(v_plan, 'starter');

  INSERT INTO tenant_limits (tenant_id, max_messages_per_month, max_ai_calls_per_month)
  VALUES (p_tenant_id, COALESCE(v_max_msgs, 50000), COALESCE(v_max_ai, 10000))
  ON CONFLICT (tenant_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION init_tenant_limits(uuid, uuid) TO authenticated;

-- =====================================================
-- 6. INICIALIZAR LIMITES PARA TENANTS EXISTENTES
-- =====================================================
INSERT INTO tenant_limits (tenant_id, max_messages_per_month, max_ai_calls_per_month)
SELECT id, 50000, 10000 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
