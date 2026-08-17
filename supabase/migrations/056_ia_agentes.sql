-- Painel de controle real dos agentes do n8n (Hunter/vendas, Ana Julia/
-- suporte, Lais/financeiro, Aurelio/geral) - substitui a tela quebrada
-- que gravava numa tabela "personas" com UNIQUE(tenant_id) (so 1 registro
-- por tenant) e referenciava colunas/tabelas que nunca existiram. A
-- "personas" antiga fica intocada, orgao vestigial.
CREATE TABLE IF NOT EXISTS ia_agentes (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  papel                     text NOT NULL CHECK (papel IN ('vendas','suporte','financeiro','geral','personalizado')),
  nome                      text NOT NULL,
  persona                   text NOT NULL DEFAULT '',
  modelo                    text NOT NULL DEFAULT 'gpt-4o',
  temperatura               numeric(2,1) NOT NULL DEFAULT 0.7 CHECK (temperatura BETWEEN 0 AND 1),
  ativo                     boolean NOT NULL DEFAULT true,
  n8n_workflow_id           text,
  n8n_node_agente           text,
  n8n_node_modelo           text,
  ultima_sincronizacao      timestamptz,
  ultimo_erro_sincronizacao text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Parcial: so os 4 papeis fixos sao 1-por-tenant; "personalizado" pode ter varios.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ia_agentes_papel_unico ON ia_agentes(tenant_id, papel) WHERE papel <> 'personalizado';
CREATE INDEX IF NOT EXISTS idx_ia_agentes_tenant ON ia_agentes(tenant_id);

ALTER TABLE ia_agentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_agentes_tenant" ON ia_agentes;
CREATE POLICY "ia_agentes_tenant" ON ia_agentes
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON ia_agentes TO authenticated;
GRANT ALL ON ia_agentes TO service_role;

CREATE TRIGGER ia_agentes_updated_at BEFORE UPDATE ON ia_agentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
