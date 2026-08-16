-- Modulo "Negocios": pipelines multiplos com etapas configuraveis por
-- pipeline, substituindo o enum fixo usado pelo Kanban de leads. Cada
-- negocio (deal) passa a referenciar diretamente pipeline_id/etapa_id, em
-- vez de um estagio fixo - permite criar pipelines novos e editar etapas
-- livremente sem migration.

CREATE TABLE IF NOT EXISTS pipelines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_etapas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  posicao     integer NOT NULL DEFAULT 0,
  e_ganho     boolean NOT NULL DEFAULT false,
  e_perdido   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_etapas_pipeline ON pipeline_etapas(pipeline_id, posicao);

ALTER TABLE negocios ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES pipelines(id) ON DELETE SET NULL;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS pipeline_etapa_id uuid REFERENCES pipeline_etapas(id) ON DELETE SET NULL;

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pipelines_tenant" ON pipelines;
CREATE POLICY "pipelines_tenant" ON pipelines
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON pipelines TO authenticated;
GRANT ALL ON pipelines TO service_role;

ALTER TABLE pipeline_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pipeline_etapas_tenant" ON pipeline_etapas;
CREATE POLICY "pipeline_etapas_tenant" ON pipeline_etapas
  FOR ALL TO authenticated
  USING (pipeline_id IN (SELECT id FROM pipelines WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())))
  WITH CHECK (pipeline_id IN (SELECT id FROM pipelines WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));
GRANT ALL ON pipeline_etapas TO authenticated;
GRANT ALL ON pipeline_etapas TO service_role;

CREATE TRIGGER pipelines_updated_at BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cria um pipeline "Vendas" padrao por tenant que ja tem algum negocio, com
-- 7 etapas espelhando o LeadStatus atual, e faz backfill dos negocios
-- existentes conforme o estagio atual (aberto->Novo, ganho->Ganho,
-- perdido->Perdido) - nenhum negocio fica sem pipeline/etapa.
DO $$
DECLARE
  t RECORD;
  v_pipeline_id uuid;
  v_etapa_novo uuid;
  v_etapa_ganho uuid;
  v_etapa_perdido uuid;
BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM negocios LOOP
    INSERT INTO pipelines (tenant_id, nome, is_default)
    VALUES (t.tenant_id, 'Vendas', true)
    RETURNING id INTO v_pipeline_id;

    INSERT INTO pipeline_etapas (pipeline_id, nome, posicao) VALUES (v_pipeline_id, 'Novo', 0) RETURNING id INTO v_etapa_novo;
    INSERT INTO pipeline_etapas (pipeline_id, nome, posicao) VALUES (v_pipeline_id, 'Em Contato', 1);
    INSERT INTO pipeline_etapas (pipeline_id, nome, posicao) VALUES (v_pipeline_id, 'Qualificado', 2);
    INSERT INTO pipeline_etapas (pipeline_id, nome, posicao) VALUES (v_pipeline_id, 'Proposta', 3);
    INSERT INTO pipeline_etapas (pipeline_id, nome, posicao) VALUES (v_pipeline_id, 'Negociação', 4);
    INSERT INTO pipeline_etapas (pipeline_id, nome, posicao, e_ganho) VALUES (v_pipeline_id, 'Ganho', 5, true) RETURNING id INTO v_etapa_ganho;
    INSERT INTO pipeline_etapas (pipeline_id, nome, posicao, e_perdido) VALUES (v_pipeline_id, 'Perdido', 6, true) RETURNING id INTO v_etapa_perdido;

    UPDATE negocios SET pipeline_id = v_pipeline_id,
      pipeline_etapa_id = CASE estagio
        WHEN 'ganho' THEN v_etapa_ganho
        WHEN 'perdido' THEN v_etapa_perdido
        ELSE v_etapa_novo
      END
    WHERE tenant_id = t.tenant_id;
  END LOOP;
END $$;
