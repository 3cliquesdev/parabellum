-- Equipe de vendedores de cada pipeline - usado pra distribuicao
-- round-robin (menor carga atual, so entre quem esta online) dos negocios
-- sem responsavel.
CREATE TABLE IF NOT EXISTS pipeline_vendedores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, user_id)
);

ALTER TABLE pipeline_vendedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pipeline_vendedores_tenant" ON pipeline_vendedores;
CREATE POLICY "pipeline_vendedores_tenant" ON pipeline_vendedores
  FOR ALL TO authenticated
  USING (pipeline_id IN (SELECT id FROM pipelines WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())))
  WITH CHECK (pipeline_id IN (SELECT id FROM pipelines WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));
GRANT ALL ON pipeline_vendedores TO authenticated;
GRANT ALL ON pipeline_vendedores TO service_role;
