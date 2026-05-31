-- =====================================================
-- Liberty CRM — ONDA 1: Reseller / White Label
-- Hierarquia 3 níveis: Platform → Agencies → Tenants
-- =====================================================

-- =====================================================
-- 1. TABELA: agencies (resellers)
-- =====================================================
CREATE TABLE IF NOT EXISTS agencies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,

  owner_user_id     uuid NOT NULL REFERENCES auth.users(id),

  -- Branding
  display_name      text,
  logo_url          text,
  favicon_url       text,
  primary_color     text DEFAULT '#9aea62',
  secondary_color   text DEFAULT '#000000',
  support_email     text,

  -- Custom domain
  custom_domain     text UNIQUE,
  domain_status     text DEFAULT 'pending' CHECK (domain_status IN (
    'pending','verifying','active','failed','disabled'
  )),
  domain_verified_at timestamptz,
  vercel_domain_id  text,

  -- Plano (placeholder para Onda 2)
  plan              text DEFAULT 'starter' CHECK (plan IN (
    'starter','growth','scale','enterprise'
  )),
  max_tenants       int DEFAULT 10,

  -- Status
  status            text DEFAULT 'active' CHECK (status IN (
    'active','suspended','cancelled'
  )),

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agencies_custom_domain ON agencies(custom_domain)
  WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_owner ON agencies(owner_user_id);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. TABELA: agency_users (equipe da agência)
-- =====================================================
CREATE TABLE IF NOT EXISTS agency_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'staff' CHECK (role IN (
    'owner','admin','staff','viewer'
  )),
  invited_by  uuid REFERENCES auth.users(id),
  invited_at  timestamptz DEFAULT now(),
  joined_at   timestamptz,
  UNIQUE(agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_users_agency ON agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_user ON agency_users(user_id);

ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. agency_id em tenants
-- =====================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_tenants_agency ON tenants(agency_id);

-- =====================================================
-- 4. TABELA: impersonation_sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id    uuid NOT NULL REFERENCES auth.users(id),
  agency_id         uuid NOT NULL REFERENCES agencies(id),
  target_tenant_id  uuid NOT NULL REFERENCES tenants(id),
  token_hash        text NOT NULL,
  started_at        timestamptz DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  reason            text,
  ip_address        text,
  user_agent        text
);

CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonation_sessions(expires_at)
  WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_impersonation_agency ON impersonation_sessions(agency_id, started_at DESC);

ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. FUNÇÕES HELPER (SECURITY DEFINER, STABLE)
-- =====================================================

-- Retorna tenant IDs do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF uuid AS $$
  SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retorna agency IDs do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_agency_ids()
RETURNS SETOF uuid AS $$
  SELECT agency_id FROM agency_users WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retorna tenant IDs das agências do usuário
CREATE OR REPLACE FUNCTION get_user_agency_tenant_ids()
RETURNS SETOF uuid AS $$
  SELECT t.id FROM tenants t
  WHERE t.agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se é super admin (super_admins usa coluna email)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM super_admins WHERE email = auth.email());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Tenant impersonado na sessão atual
CREATE OR REPLACE FUNCTION current_impersonated_tenant_id()
RETURNS uuid AS $$
DECLARE
  claim_value text;
BEGIN
  BEGIN
    claim_value := current_setting('request.jwt.claims', true)::json->>'acting_as_tenant_id';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  IF claim_value IS NULL OR claim_value = '' THEN RETURN NULL; END IF;
  RETURN claim_value::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Revogar de anon
REVOKE EXECUTE ON FUNCTION get_user_tenant_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_agency_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_agency_tenant_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION current_impersonated_tenant_id() FROM anon;

-- =====================================================
-- 6. RLS 3 NÍVEIS — PATTERN APLICADO EM TODAS AS TABELAS
-- =====================================================

-- Macro para o padrão:
-- Caso 1: super admin
-- Caso 2: membro direto do tenant
-- Caso 3: usuário da agência dona do tenant
-- Caso 4: sessão de impersonation ativa

-- Helper inline reutilizável (usado nas policies abaixo)
-- tenant_id IN (user_tenants ∪ agency_tenants ∪ impersonated)

-- TENANT_MEMBERS
DROP POLICY IF EXISTS "members_select_own" ON tenant_members;
CREATE POLICY "tenant_members_multi" ON tenant_members
  FOR ALL TO authenticated
  USING (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  );

-- LEADS
DROP POLICY IF EXISTS "leads_tenant_select" ON leads;
DROP POLICY IF EXISTS "leads_tenant_insert" ON leads;
DROP POLICY IF EXISTS "leads_tenant_update" ON leads;
DROP POLICY IF EXISTS "leads_tenant_delete" ON leads;
CREATE POLICY "leads_multi" ON leads
  FOR ALL TO authenticated
  USING (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  );

-- ATIVIDADES
DROP POLICY IF EXISTS "atividades_tenant_select" ON atividades;
DROP POLICY IF EXISTS "atividades_tenant_insert" ON atividades;
DROP POLICY IF EXISTS "atividades_tenant_update" ON atividades;
DROP POLICY IF EXISTS "atividades_tenant_delete" ON atividades;
CREATE POLICY "atividades_multi" ON atividades
  FOR ALL TO authenticated
  USING (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  );

-- CONVERSAS
DROP POLICY IF EXISTS "conversas_tenant_select" ON conversas;
DROP POLICY IF EXISTS "conversas_tenant_insert" ON conversas;
DROP POLICY IF EXISTS "conversas_tenant_update" ON conversas;
CREATE POLICY "conversas_multi" ON conversas
  FOR ALL TO authenticated
  USING (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  );

-- MENSAGENS
DROP POLICY IF EXISTS "mensagens_tenant_select" ON mensagens;
DROP POLICY IF EXISTS "mensagens_tenant_insert" ON mensagens;
CREATE POLICY "mensagens_multi" ON mensagens
  FOR ALL TO authenticated
  USING (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  );

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "subscriptions_tenant_select" ON subscriptions;
CREATE POLICY "subscriptions_multi" ON subscriptions
  FOR ALL TO authenticated
  USING (
    is_super_admin() OR
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    tenant_id IN (SELECT get_user_agency_tenant_ids()) OR
    tenant_id = current_impersonated_tenant_id()
  );

-- TENANTS (agência vê seus tenants)
DROP POLICY IF EXISTS "tenants_select" ON tenants;
CREATE POLICY "tenants_multi" ON tenants
  FOR SELECT TO authenticated
  USING (
    is_super_admin() OR
    id IN (SELECT get_user_tenant_ids()) OR
    agency_id IN (SELECT get_user_agency_ids()) OR
    id = current_impersonated_tenant_id()
  );

-- =====================================================
-- 7. RLS NAS NOVAS TABELAS
-- =====================================================

-- AGENCIES
CREATE POLICY "agencies_select" ON agencies
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id IN (SELECT get_user_agency_ids()));

CREATE POLICY "agencies_update" ON agencies
  FOR UPDATE TO authenticated
  USING (
    is_super_admin() OR
    id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid() AND role IN ('owner','admin'))
  );

CREATE POLICY "agencies_insert_admin" ON agencies
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "agencies_delete_admin" ON agencies
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- AGENCY_USERS
CREATE POLICY "agency_users_isolation" ON agency_users
  FOR ALL TO authenticated
  USING (
    is_super_admin() OR
    agency_id IN (SELECT get_user_agency_ids())
  );

-- IMPERSONATION_SESSIONS
CREATE POLICY "impersonation_isolation" ON impersonation_sessions
  FOR ALL TO authenticated
  USING (
    is_super_admin() OR
    agency_user_id = auth.uid() OR
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid() AND role IN ('owner','admin'))
  );

-- =====================================================
-- 8. GRANTS
-- =====================================================
GRANT ALL ON agencies TO authenticated;
GRANT ALL ON agency_users TO authenticated;
GRANT ALL ON impersonation_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_agency_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_agency_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION current_impersonated_tenant_id() TO authenticated;

-- =====================================================
-- 9. AGÊNCIA PADRÃO "Liberty Direct" para tenants existentes
-- (substitua <SUPER_ADMIN_USER_ID> pelo UUID real)
-- =====================================================
-- INSERT INTO agencies (name, slug, owner_user_id, display_name, status)
-- VALUES ('Liberty Direct', 'liberty-direct', '<SUPER_ADMIN_USER_ID>', 'Liberty CRM', 'active')
-- ON CONFLICT (slug) DO NOTHING;
--
-- UPDATE tenants SET agency_id = (SELECT id FROM agencies WHERE slug = 'liberty-direct')
-- WHERE agency_id IS NULL;
