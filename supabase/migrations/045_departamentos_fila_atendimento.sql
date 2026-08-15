-- Departamentos reais, vinculo agente<->departamento, e fila de atendimento humano
-- para a IA transferir conversas ao vivo quando nao consegue resolver sozinha.

CREATE TABLE IF NOT EXISTS departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  slug       text NOT NULL,
  parent_id  uuid REFERENCES departments(id) ON DELETE SET NULL,
  color      text NOT NULL DEFAULT '#60a5fa',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_tenant" ON departments;
CREATE POLICY "departments_tenant" ON departments
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON departments TO authenticated;
GRANT ALL ON departments TO service_role;

CREATE TABLE IF NOT EXISTS agent_departments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_departments_dept ON agent_departments(department_id);

ALTER TABLE agent_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_departments_tenant" ON agent_departments;
CREATE POLICY "agent_departments_tenant" ON agent_departments
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON agent_departments TO authenticated;
GRANT ALL ON agent_departments TO service_role;

ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'online'
  CHECK (availability_status IN ('online', 'away', 'offline'));
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS max_concurrent_chats integer NOT NULL DEFAULT 10;
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS ultima_atribuicao timestamptz;

ALTER TABLE conversas ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS dispatch_status text CHECK (dispatch_status IN ('fila', 'atribuido'));
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_conversas_assigned ON conversas(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversas_department ON conversas(department_id);

CREATE TABLE IF NOT EXISTS conversation_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversa_id   uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  motivo        text,
  prioridade    integer NOT NULL DEFAULT 0,
  queued_at     timestamptz NOT NULL DEFAULT now(),
  assigned_at   timestamptz,
  UNIQUE (conversa_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_queue_dept ON conversation_queue(tenant_id, department_id, assigned_at);

ALTER TABLE conversation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_queue_tenant" ON conversation_queue;
CREATE POLICY "conversation_queue_tenant" ON conversation_queue
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON conversation_queue TO authenticated;
GRANT ALL ON conversation_queue TO service_role;

-- Seed dos departamentos reais da 3Cliques (mapeados 1:1 com o menu do WhatsApp)
DO $$
DECLARE
  v_tenant_id uuid := '1d47398e-9d3a-46b2-ac76-b0a3ca09afc4';
  v_owner_id uuid;
  v_suporte_id uuid;
  v_dept_id uuid;
  v_dept record;
BEGIN
  SELECT user_id INTO v_owner_id FROM tenant_members WHERE tenant_id = v_tenant_id AND role = 'owner' LIMIT 1;

  INSERT INTO departments (tenant_id, name, slug, color)
  VALUES
    (v_tenant_id, 'Comercial - Nacional', 'comercial_nacional', '#16a34a'),
    (v_tenant_id, 'Comercial - Internacional', 'comercial_internacional', '#0ea5e9'),
    (v_tenant_id, 'Suporte', 'suporte', '#3b82f6'),
    (v_tenant_id, 'Financeiro', 'financeiro', '#f59e0b'),
    (v_tenant_id, 'Customer Success', 'customer_success', '#a78bfa')
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  SELECT id INTO v_suporte_id FROM departments WHERE tenant_id = v_tenant_id AND slug = 'suporte';

  INSERT INTO departments (tenant_id, name, slug, parent_id, color)
  VALUES
    (v_tenant_id, 'Suporte Pedidos', 'suporte_pedidos', v_suporte_id, '#3b82f6'),
    (v_tenant_id, 'Suporte Sistema', 'suporte_sistema', v_suporte_id, '#6366f1')
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  IF v_owner_id IS NOT NULL THEN
    FOR v_dept IN SELECT id FROM departments WHERE tenant_id = v_tenant_id LOOP
      INSERT INTO agent_departments (tenant_id, user_id, department_id, is_primary)
      VALUES (v_tenant_id, v_owner_id, v_dept.id, true)
      ON CONFLICT (user_id, department_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;
