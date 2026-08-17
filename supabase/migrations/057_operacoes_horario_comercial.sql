-- Operacoes (modelos de drop: Hibrido, Internacional, Nacional) usadas no
-- campo "Operacao" dos tickets, e configuracao de horario comercial do tenant
-- (usada pela IA antes de transferir conversa pra atendimento humano).

CREATE TABLE IF NOT EXISTS operacoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operacoes_tenant" ON operacoes;
CREATE POLICY "operacoes_tenant" ON operacoes
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON operacoes TO authenticated;
GRANT ALL ON operacoes TO service_role;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS horario_atendimento_inicio time;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS horario_atendimento_fim time;
-- Dias da semana ativos, 0=domingo .. 6=sabado. Nulo = sem horario configurado
-- (nesse caso a checagem de horario comercial e ignorada, mantendo o
-- comportamento atual de transferir a qualquer hora).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS horario_atendimento_dias smallint[];

ALTER TABLE departments ADD COLUMN IF NOT EXISTS auto_close_minutos integer;

INSERT INTO operacoes (tenant_id, nome)
VALUES
  ('1d47398e-9d3a-46b2-ac76-b0a3ca09afc4', 'Nacional'),
  ('1d47398e-9d3a-46b2-ac76-b0a3ca09afc4', 'Hibrido'),
  ('1d47398e-9d3a-46b2-ac76-b0a3ca09afc4', 'Internacional')
ON CONFLICT (tenant_id, nome) DO NOTHING;

UPDATE tenants
SET horario_atendimento_inicio = '08:00',
    horario_atendimento_fim = '17:00',
    horario_atendimento_dias = ARRAY[1,2,3,4,5]::smallint[]
WHERE id = '1d47398e-9d3a-46b2-ac76-b0a3ca09afc4'
  AND horario_atendimento_inicio IS NULL;
