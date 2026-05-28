-- =====================================================
-- Liberty CRM — Multi-Tenant Schema
-- =====================================================

-- 1. Plans
CREATE TABLE IF NOT EXISTS plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  price_brl   numeric(10,2) NOT NULL DEFAULT 0,
  max_workspaces int NOT NULL DEFAULT 1,
  max_leads   int NOT NULL DEFAULT 500,
  features    jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO plans (name, price_brl, max_workspaces, max_leads, features) VALUES
  ('Starter', 97.00,  1, 500,   '["pipeline","contacts","activities","support_email"]'),
  ('Pro',     197.00, 3, -1,    '["pipeline","contacts","activities","inbox_ai","analytics","integrations","support_priority"]'),
  ('Agency',  397.00, -1, -1,   '["pipeline","contacts","activities","inbox_ai","analytics","integrations","white_label","api_access","support_whatsapp"]');

-- 2. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  plan_id     uuid REFERENCES plans(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 3. Tenant members
CREATE TABLE IF NOT EXISTS tenant_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select_own" ON tenant_members
  FOR SELECT USING (user_id = auth.uid());

-- 4. Leads
CREATE TABLE IF NOT EXISTS leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome                text NOT NULL,
  whatsapp            text,
  email               text,
  instagram           text,
  faturamento         text,
  servico_interesse   text,
  status              text NOT NULL DEFAULT 'novo'
                        CHECK (status IN ('novo','em_contato','qualificado','proposta','negociacao','ganho','perdido')),
  observacoes         text,
  valor_estimado      numeric(12,2),
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_tenant_select" ON leads FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "leads_tenant_insert" ON leads FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "leads_tenant_update" ON leads FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "leads_tenant_delete" ON leads FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- 5. Atividades
CREATE TABLE IF NOT EXISTS atividades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo          text NOT NULL CHECK (tipo IN ('ligacao','whatsapp','email','reuniao','outro')),
  titulo        text NOT NULL,
  descricao     text,
  prazo         timestamptz,
  concluida     boolean NOT NULL DEFAULT false,
  concluida_em  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atividades_tenant_select" ON atividades FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "atividades_tenant_insert" ON atividades FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "atividades_tenant_update" ON atividades FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "atividades_tenant_delete" ON atividades FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- 6. Conversas
CREATE TABLE IF NOT EXISTS conversas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  canal       text NOT NULL DEFAULT 'interno' CHECK (canal IN ('whatsapp','email','interno')),
  status      text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','resolvido','pausado')),
  ia_ativa    boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversas_tenant_select" ON conversas FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "conversas_tenant_insert" ON conversas FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "conversas_tenant_update" ON conversas FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- 7. Mensagens
CREATE TABLE IF NOT EXISTS mensagens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id     uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  remetente       text NOT NULL CHECK (remetente IN ('lead','ia','humano')),
  conteudo        text NOT NULL,
  wa_message_id   text,
  enviada         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mensagens_tenant_select" ON mensagens FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "mensagens_tenant_insert" ON mensagens FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- 8. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id               uuid NOT NULL REFERENCES plans(id),
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','past_due','trialing')),
  mp_subscription_id    text,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_tenant_select" ON subscriptions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- =====================================================
-- Trigger: criar tenant automaticamente no signup
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant_id   uuid;
  v_plan_id     uuid;
  v_company     text;
  v_slug        text;
BEGIN
  -- Pegar o plano Starter como padrão
  SELECT id INTO v_plan_id FROM plans WHERE name = 'Starter' LIMIT 1;

  -- Nome da empresa vem do metadata do signup
  v_company := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');
  v_slug    := lower(regexp_replace(v_company, '[^a-zA-Z0-9]', '-', 'g'))
               || '-' || substring(NEW.id::text, 1, 8);

  -- Criar tenant
  INSERT INTO tenants (name, slug, plan_id)
  VALUES (v_company, v_slug, v_plan_id)
  RETURNING id INTO v_tenant_id;

  -- Vincular usuário como owner
  INSERT INTO tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, 'owner');

  -- Criar subscription trial (30 dias)
  INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
  VALUES (v_tenant_id, v_plan_id, 'trialing', now(), now() + interval '30 days');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversas_updated_at BEFORE UPDATE ON conversas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
