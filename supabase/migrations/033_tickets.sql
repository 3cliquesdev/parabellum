-- Sistema de tickets de suporte — usado pelo papel "atendente" e como
-- ferramenta de acao para o agente de IA orquestrado no n8n.

CREATE TABLE IF NOT EXISTS ticket_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  cor        text NOT NULL DEFAULT '#60a5fa',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_categories_tenant" ON ticket_categories;
CREATE POLICY "ticket_categories_tenant" ON ticket_categories
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON ticket_categories TO authenticated;
GRANT ALL ON ticket_categories TO service_role;

CREATE TABLE IF NOT EXISTS tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero        bigserial UNIQUE,
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  categoria_id  uuid REFERENCES ticket_categories(id) ON DELETE SET NULL,
  lead_id       uuid REFERENCES leads(id) ON DELETE SET NULL,
  conversa_id   uuid REFERENCES conversas(id) ON DELETE SET NULL,
  titulo        text NOT NULL,
  descricao     text,
  status        text NOT NULL DEFAULT 'aberto'
                  CHECK (status IN ('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado')),
  prioridade    text NOT NULL DEFAULT 'media'
                  CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  canal_origem  text NOT NULL DEFAULT 'manual'
                  CHECK (canal_origem IN ('whatsapp', 'email', 'instagram', 'telegram', 'facebook_messenger', 'manual', 'ia')),
  assigned_to   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  closed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_lead ON tickets(lead_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_tenant" ON tickets;
CREATE POLICY "tickets_tenant" ON tickets
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON tickets TO authenticated;
GRANT ALL ON tickets TO service_role;

CREATE TABLE IF NOT EXISTS ticket_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  autor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_tipo  text NOT NULL DEFAULT 'agente' CHECK (autor_tipo IN ('agente', 'ia', 'sistema', 'cliente')),
  conteudo    text NOT NULL,
  interno     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id, created_at);

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_comments_tenant" ON ticket_comments;
CREATE POLICY "ticket_comments_tenant" ON ticket_comments
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON ticket_comments TO authenticated;
GRANT ALL ON ticket_comments TO service_role;

CREATE TABLE IF NOT EXISTS ticket_stakeholders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel      text NOT NULL DEFAULT 'observador' CHECK (papel IN ('responsavel', 'observador')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_stakeholders_ticket ON ticket_stakeholders(ticket_id);

ALTER TABLE ticket_stakeholders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_stakeholders_tenant" ON ticket_stakeholders;
CREATE POLICY "ticket_stakeholders_tenant" ON ticket_stakeholders
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON ticket_stakeholders TO authenticated;
GRANT ALL ON ticket_stakeholders TO service_role;

CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
