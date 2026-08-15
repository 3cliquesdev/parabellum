-- Papeis de equipe: dono, gerente, vendedor, atendente
ALTER TABLE tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;
ALTER TABLE tenant_members ALTER COLUMN role SET DEFAULT 'vendedor';
ALTER TABLE tenant_members ADD CONSTRAINT tenant_members_role_check
  CHECK (role IN ('owner', 'gerente', 'vendedor', 'atendente'));

-- handle_new_user() ja usa role='owner' no INSERT (migration 001) — continua valendo.

-- Tabela de convites (referenciada pelo codigo em /api/team/invite e /api/team/accept,
-- mas nunca existiu em nenhuma migration versionada — mesmo gap de 002-009 do 027).
CREATE TABLE IF NOT EXISTS invite_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'vendedor' CHECK (role IN ('owner', 'gerente', 'vendedor', 'atendente')),
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid REFERENCES auth.users(id),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_tenant ON invite_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Leitura: membros do proprio tenant veem os convites pendentes do tenant
-- (TeamSection le direto do client com a anon key + sessao).
DROP POLICY IF EXISTS "invite_tokens_tenant_select" ON invite_tokens;
CREATE POLICY "invite_tokens_tenant_select" ON invite_tokens
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Escrita (criar/aceitar convite) so acontece via rotas server-side com service_role,
-- que ignora RLS por design — sem policies de INSERT/UPDATE/DELETE para authenticated/anon.

GRANT ALL ON invite_tokens TO service_role;
GRANT SELECT ON invite_tokens TO authenticated;
