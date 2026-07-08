-- ============================================================================
-- VERSIONAMENTO DE SCHEMA CRITICO AUSENTE
-- ============================================================================
-- As tabelas abaixo sao referenciadas pelo codigo e por RLS/funcoes existentes,
-- mas NAO estavam em nenhuma migration versionada (a numeracao pula 001 -> 010,
-- entao 002-009 nunca entraram no repo). Isso torna o schema irreproduzivel em
-- um ambiente novo e impossivel de auditar a partir do repositorio.
--
-- Este arquivo reconstroi essas tabelas a partir do USO REAL no codigo
-- (selects/inserts/upserts) e das dependencias de RLS. Todas usam
-- CREATE TABLE IF NOT EXISTS, entao sao NO-OP em producao (nao sobrescrevem
-- o que ja existe) e servem para reproduzir o schema em ambientes limpos.
--
-- IMPORTANTE: por seguranca isto e um best-effort. Rode `supabase db pull`
-- contra producao para capturar o schema exato (tipos, defaults, constraints)
-- e reconcilie com este arquivo antes de confiar nele para um deploy do zero.
-- ============================================================================

-- super_admins: sustenta is_super_admin() (012) e os gates /api/admin/*.
-- Sem tenant — e uma tabela de nivel plataforma, chaveada por email.
CREATE TABLE IF NOT EXISTS super_admins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy para anon/authenticated: acesso somente via service_role
-- (que ignora RLS) nas rotas admin, que ja validam o email do usuario.

-- whatsapp_configs: credenciais Meta por tenant (uma conexao ativa por tenant).
CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id text,
  waba_id         text,
  access_token    text,
  verify_token    text DEFAULT 'liberty-crm',
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_configs' AND policyname = 'whatsapp_configs_tenant') THEN
    CREATE POLICY whatsapp_configs_tenant ON whatsapp_configs FOR ALL
      USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- personas: config do agente de IA por tenant.
CREATE TABLE IF NOT EXISTS personas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome                text,
  empresa             text,
  descricao           text,
  temperatura         numeric DEFAULT 0.7,
  max_tokens          integer DEFAULT 1000,
  responder_com_audio boolean DEFAULT false,
  voz_tts             text DEFAULT 'pt-BR-feminina',
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personas' AND policyname = 'personas_tenant') THEN
    CREATE POLICY personas_tenant ON personas FOR ALL
      USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ai_usage: contador mensal de uso de IA por tenant (chave tenant + year_month).
CREATE TABLE IF NOT EXISTS ai_usage (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  count      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, year_month)
);
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage' AND policyname = 'ai_usage_tenant') THEN
    CREATE POLICY ai_usage_tenant ON ai_usage FOR ALL
      USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
  END IF;
END $$;
