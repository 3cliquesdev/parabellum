-- Timeline unificada do cliente (estilo HubSpot): historico de status do lead
-- e vendas/receita vindas de integracoes externas (Kiwify = cursos e assinaturas).
--
-- "vendas" != "pedidos": pedidos (fulfillment) vira de outra fonte de dados no
-- futuro. Aqui registramos eventos de pagamento/receita (Kiwify): pago,
-- carrinho abandonado, cartao recusado, reembolso, chargeback.

CREATE TABLE IF NOT EXISTS lead_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status_de   text,
  status_para text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON lead_status_history(lead_id, created_at);

ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_status_history_tenant" ON lead_status_history;
CREATE POLICY "lead_status_history_tenant" ON lead_status_history
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT ON lead_status_history TO authenticated;
GRANT ALL ON lead_status_history TO service_role;

CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_status_history (tenant_id, lead_id, status_de, status_para)
    VALUES (NEW.tenant_id, NEW.id, NULL, NEW.status);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO lead_status_history (tenant_id, lead_id, status_de, status_para)
    VALUES (NEW.tenant_id, NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_lead_status_change ON leads;
CREATE TRIGGER trg_log_lead_status_change
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_lead_status_change();

CREATE TABLE IF NOT EXISTS vendas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id        uuid REFERENCES leads(id) ON DELETE SET NULL,
  produto_nome   text NOT NULL,
  valor          numeric(12,2) NOT NULL DEFAULT 0,
  moeda          text NOT NULL DEFAULT 'BRL',
  status         text NOT NULL DEFAULT 'pago'
                   CHECK (status IN ('pago', 'carrinho_abandonado', 'cartao_recusado', 'reembolsado', 'cancelado', 'chargeback')),
  tipo_produto   text NOT NULL DEFAULT 'curso' CHECK (tipo_produto IN ('curso', 'assinatura', 'outro')),
  origem         text NOT NULL DEFAULT 'manual',
  external_id    text,
  raw_payload    jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  paid_at        timestamptz,
  UNIQUE (tenant_id, origem, external_id)
);

CREATE INDEX IF NOT EXISTS idx_vendas_lead ON vendas(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_tenant ON vendas(tenant_id, created_at);

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendas_tenant" ON vendas;
CREATE POLICY "vendas_tenant" ON vendas
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON vendas TO authenticated;
GRANT ALL ON vendas TO service_role;
