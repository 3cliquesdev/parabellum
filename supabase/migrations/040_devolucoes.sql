-- Devolucoes de produtos fisicos, modelo portado do Parabellum (4600+ casos
-- reais processados). Pedido fisico em si (fonte de dados externa, ainda
-- nao definida) fica de fora por enquanto — aqui so tratamos o processo de
-- devolucao em cima de um external_order_id/tracking_code vindos de fora.

CREATE TABLE IF NOT EXISTS motivos_devolucao (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chave      text NOT NULL,
  label      text NOT NULL,
  ativo      boolean NOT NULL DEFAULT true,
  ordem      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chave)
);

ALTER TABLE motivos_devolucao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "motivos_devolucao_tenant" ON motivos_devolucao;
CREATE POLICY "motivos_devolucao_tenant" ON motivos_devolucao
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON motivos_devolucao TO authenticated;
GRANT ALL ON motivos_devolucao TO service_role;

CREATE TABLE IF NOT EXISTS devolucoes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id                uuid REFERENCES leads(id) ON DELETE SET NULL,
  external_order_id      text,
  tracking_code_original text,
  tracking_code_return   text,
  motivo                 text,
  descricao              text,
  status                 text NOT NULL DEFAULT 'pendente'
                           CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'reembolsada')),
  product_items          jsonb NOT NULL DEFAULT '[]',
  created_by             uuid REFERENCES auth.users(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devolucoes_lead ON devolucoes(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_devolucoes_tenant ON devolucoes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_devolucoes_order ON devolucoes(external_order_id);

ALTER TABLE devolucoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "devolucoes_tenant" ON devolucoes;
CREATE POLICY "devolucoes_tenant" ON devolucoes
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON devolucoes TO authenticated;
GRANT ALL ON devolucoes TO service_role;

CREATE TRIGGER devolucoes_updated_at BEFORE UPDATE ON devolucoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
