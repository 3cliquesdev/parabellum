-- Dados sincronizados por sistemas externos para consulta da IA. O CRM e o
-- dono da base; o n8n apenas consulta estes registros quando necessario.
CREATE TABLE IF NOT EXISTS external_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  external_customer_id text NOT NULL,
  nome text,
  email_normalized text,
  cpf_normalized text,
  cnpj_normalized text,
  wallet_balance numeric(14,2),
  wallet_currency text NOT NULL DEFAULT 'BRL',
  wallet_updated_at timestamptz,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, external_customer_id)
);

CREATE TABLE IF NOT EXISTS external_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES external_customers(id) ON DELETE SET NULL,
  external_order_id text NOT NULL,
  sku text NOT NULL DEFAULT '',
  produto_nome text,
  status text NOT NULL DEFAULT 'outro',
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor numeric(14,2),
  moeda text NOT NULL DEFAULT 'BRL',
  ordered_at timestamptz,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, external_order_id, sku)
);

CREATE TABLE IF NOT EXISTS external_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku text NOT NULL,
  produto_nome text,
  quantidade_disponivel integer NOT NULL DEFAULT 0,
  quantidade_reservada integer NOT NULL DEFAULT 0,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_external_customers_email ON external_customers(tenant_id, email_normalized) WHERE email_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_customers_cpf ON external_customers(tenant_id, cpf_normalized) WHERE cpf_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_customers_cnpj ON external_customers(tenant_id, cnpj_normalized) WHERE cnpj_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_orders_customer ON external_orders(tenant_id, customer_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_orders_order ON external_orders(tenant_id, external_order_id);

ALTER TABLE external_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_customers_tenant_read" ON external_customers
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "external_orders_tenant_read" ON external_orders
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "external_inventory_tenant_read" ON external_inventory
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
