-- Parte 1: quem enviou cada mensagem (atendente humano ou agente de IA).
ALTER TABLE mensagens
  ADD COLUMN IF NOT EXISTS enviado_por_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ia_agente_nome text;

-- Parte 2: eventos de assumir/transferir/resolver, pra timeline (hoje so o
-- UPDATE direto em conversas acontecia, sem nenhum registro de quem/quando).
CREATE TABLE IF NOT EXISTS conversa_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('assumido', 'transferido', 'resolvido')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversa_eventos_conversa ON conversa_eventos(conversa_id, criado_em);

ALTER TABLE conversa_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversa_eventos_tenant_select" ON conversa_eventos;
CREATE POLICY "conversa_eventos_tenant_select" ON conversa_eventos
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "conversa_eventos_tenant_insert" ON conversa_eventos;
CREATE POLICY "conversa_eventos_tenant_insert" ON conversa_eventos
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "conversa_eventos_service_all" ON conversa_eventos;
CREATE POLICY "conversa_eventos_service_all" ON conversa_eventos
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Parte 4: marco de "primeira resposta", pra medir SLA de conversa
-- (created_at = inicio, primeira_resposta_em, resolvido_em = fim - esse
-- ultimo ja existe desde a migration 046).
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS primeira_resposta_em timestamptz;
