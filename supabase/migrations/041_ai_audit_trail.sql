-- Trilha de auditoria de decisoes da IA: toda acao que o agente executa
-- via chave interna (n8n) fica registrada aqui, com o texto original do
-- cliente mascarado (CPF/CNPJ/cartao) antes de qualquer coisa ser exposta.

CREATE TABLE IF NOT EXISTS ai_decision_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       uuid REFERENCES leads(id) ON DELETE SET NULL,
  conversa_id   uuid REFERENCES conversas(id) ON DELETE SET NULL,
  acao          text NOT NULL,
  detalhes      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_tenant ON ai_decision_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_lead ON ai_decision_logs(lead_id);

ALTER TABLE ai_decision_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_decision_logs_tenant" ON ai_decision_logs;
CREATE POLICY "ai_decision_logs_tenant" ON ai_decision_logs
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT ON ai_decision_logs TO authenticated;
GRANT ALL ON ai_decision_logs TO service_role;
