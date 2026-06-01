-- Cobrança da Agência para os Clientes Finais
CREATE TABLE IF NOT EXISTS tenant_billing (
  tenant_id           uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  agency_id           uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Precificação definida pela agência
  price_brl           numeric(10,2) NOT NULL DEFAULT 0,
  billing_cycle       text DEFAULT 'mensal' CHECK (billing_cycle IN ('mensal','trimestral','semestral','anual')),
  plan_name           text DEFAULT 'Básico',   -- nome do plano que a agência exibe ao cliente

  -- Status de pagamento
  payment_status      text DEFAULT 'trial' CHECK (payment_status IN (
    'trial','active','pending','overdue','cancelled'
  )),
  trial_ends_at       timestamptz DEFAULT (now() + interval '30 days'),
  last_paid_at        timestamptz,
  next_billing_date   date,

  -- Link de pagamento externo (Mercado Pago, ASAAS, PIX, etc.)
  payment_link        text,
  payment_provider    text DEFAULT 'manual',   -- 'manual','mercadopago','asaas','stripe'
  external_sub_id     text,                    -- ID da assinatura no provedor

  -- Observações internas da agência
  notes               text,

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_billing_agency ON tenant_billing(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_status ON tenant_billing(payment_status);

ALTER TABLE tenant_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_billing_agency" ON tenant_billing
  FOR ALL TO authenticated
  USING (
    (SELECT is_super_admin()) OR
    agency_id IN (SELECT get_user_agency_ids()) OR
    tenant_id IN (SELECT get_user_tenant_ids())
  )
  WITH CHECK (
    (SELECT is_super_admin()) OR
    agency_id IN (SELECT get_user_agency_ids())
  );

GRANT ALL ON tenant_billing TO authenticated;
