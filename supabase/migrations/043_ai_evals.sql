-- Evals continuos do agente de IA: casos de teste fixos (pergunta + criterio
-- esperado) rodados periodicamente contra o RAG real, julgados por um
-- segundo modelo, pra detectar degradacao/alucinacao antes que um cliente
-- reclame — o motivo de o agente do Parabellum ter falhado sem ninguem notar.

CREATE TABLE IF NOT EXISTS ai_eval_cases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  categoria         text NOT NULL,
  pergunta          text NOT NULL,
  criterio_esperado text NOT NULL,
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_eval_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_eval_cases_tenant" ON ai_eval_cases;
CREATE POLICY "ai_eval_cases_tenant" ON ai_eval_cases
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT ON ai_eval_cases TO authenticated;
GRANT ALL ON ai_eval_cases TO service_role;

CREATE TABLE IF NOT EXISTS ai_eval_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES ai_eval_cases(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resposta_obtida text,
  passou          boolean NOT NULL,
  nota            numeric,
  justificativa   text,
  executed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_eval_results_case ON ai_eval_results(case_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_ai_eval_results_tenant ON ai_eval_results(tenant_id, executed_at);

ALTER TABLE ai_eval_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_eval_results_tenant" ON ai_eval_results;
CREATE POLICY "ai_eval_results_tenant" ON ai_eval_results
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT ON ai_eval_results TO authenticated;
GRANT ALL ON ai_eval_results TO service_role;
