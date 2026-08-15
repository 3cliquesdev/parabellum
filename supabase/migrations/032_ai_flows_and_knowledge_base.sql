-- Motor de fluxos de IA (chatbot builder) + base de conhecimento com embeddings.
-- Mais um gap do 002-009 nunca versionado (referenciado por src/lib/flow-engine.ts,
-- src/app/api/flows/route.ts, src/app/(app)/ia/knowledge/page.tsx, src/app/api/ai/*).

CREATE TABLE IF NOT EXISTS chat_flows (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  descricao        text,
  departamento     text NOT NULL DEFAULT 'todos',
  trigger_keywords text[] NOT NULL DEFAULT '{}',
  is_master        boolean NOT NULL DEFAULT false,
  prioridade       integer NOT NULL DEFAULT 0,
  ativo            boolean NOT NULL DEFAULT true,
  flow_definition  jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_flows_tenant ON chat_flows(tenant_id);

ALTER TABLE chat_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_flows_tenant" ON chat_flows;
CREATE POLICY "chat_flows_tenant" ON chat_flows
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON chat_flows TO authenticated;
GRANT ALL ON chat_flows TO service_role;

CREATE TABLE IF NOT EXISTS chat_flow_states (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversa_id     uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  flow_id         uuid NOT NULL REFERENCES chat_flows(id) ON DELETE CASCADE,
  current_node_id text NOT NULL,
  status          text NOT NULL DEFAULT 'ativo',
  collected_data  jsonb NOT NULL DEFAULT '{}',
  tentativas_ia   integer NOT NULL DEFAULT 0,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_flow_states_conversa ON chat_flow_states(conversa_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_flow_states_tenant ON chat_flow_states(tenant_id);

ALTER TABLE chat_flow_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_flow_states_tenant" ON chat_flow_states;
CREATE POLICY "chat_flow_states_tenant" ON chat_flow_states
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON chat_flow_states TO authenticated;
GRANT ALL ON chat_flow_states TO service_role;

CREATE TABLE IF NOT EXISTS knowledge_base (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo     text NOT NULL,
  conteudo   text NOT NULL,
  categoria  text NOT NULL DEFAULT 'Geral',
  tags       text[] NOT NULL DEFAULT '{}',
  publicado  boolean NOT NULL DEFAULT false,
  embedding  extensions.vector(768),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant ON knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base
  USING hnsw (embedding extensions.vector_cosine_ops);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge_base_tenant" ON knowledge_base;
CREATE POLICY "knowledge_base_tenant" ON knowledge_base
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON knowledge_base TO authenticated;
GRANT ALL ON knowledge_base TO service_role;

CREATE TABLE IF NOT EXISTS knowledge_candidates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pergunta   text NOT NULL,
  resposta   text,
  categoria  text NOT NULL DEFAULT 'Geral',
  status     text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_candidates_tenant ON knowledge_candidates(tenant_id, status);

ALTER TABLE knowledge_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge_candidates_tenant" ON knowledge_candidates;
CREATE POLICY "knowledge_candidates_tenant" ON knowledge_candidates
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON knowledge_candidates TO authenticated;
GRANT ALL ON knowledge_candidates TO service_role;

CREATE TRIGGER chat_flows_updated_at BEFORE UPDATE ON chat_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
