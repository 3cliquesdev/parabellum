-- Historico de eventos do negocio: criacao, mudanca de etapa, ganho/perdido.
-- Base pra medir SLA por etapa (tempo entre eventos) e responder "de onde
-- veio, quem moveu, quanto tempo levou" por negocio - sem isso capturado
-- desde a transicao, nao da pra calcular retroativamente depois.
CREATE TABLE IF NOT EXISTS negocio_eventos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id        uuid NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo              text NOT NULL CHECK (tipo IN ('criado', 'mudanca_etapa', 'ganho', 'perdido')),
  etapa_anterior_id uuid REFERENCES pipeline_etapas(id) ON DELETE SET NULL,
  etapa_nova_id     uuid REFERENCES pipeline_etapas(id) ON DELETE SET NULL,
  usuario_id        uuid,
  origem            text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_negocio_eventos_negocio ON negocio_eventos(negocio_id, created_at);

ALTER TABLE negocio_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "negocio_eventos_tenant" ON negocio_eventos;
CREATE POLICY "negocio_eventos_tenant" ON negocio_eventos
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON negocio_eventos TO authenticated;
GRANT ALL ON negocio_eventos TO service_role;
