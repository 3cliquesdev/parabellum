-- Pre-requisito pra disparo de mensagens WhatsApp via template (Meta Cloud
-- API) fora da janela de 24h: tabela de templates aprovados (ja esperada
-- pela tela /broadcasts/templates e sua API, que nunca tinham sido
-- aplicadas de fato no banco) + coluna que marca a ultima mensagem
-- recebida do lead (ultima_mensagem_em/remetente sao sobrescritos em toda
-- mensagem, entrada ou saida, entao nao servem sozinhos pra saber se a
-- janela de resposta livre de 24h ainda esta aberta).

CREATE TABLE IF NOT EXISTS meta_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_name     text NOT NULL,
  language_code     text NOT NULL DEFAULT 'pt_BR',
  category          text NOT NULL CHECK (category IN ('MARKETING','UTILITY','AUTHENTICATION')),
  meta_template_id  text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','disabled')),
  rejection_reason  text,
  header_type       text CHECK (header_type IN ('TEXT','IMAGE','VIDEO','DOCUMENT','NONE')) DEFAULT 'NONE',
  header_text       text,
  body_text         text NOT NULL,
  footer_text       text,
  buttons           jsonb DEFAULT '[]',
  variables_count   int NOT NULL DEFAULT 0,
  variables_schema  jsonb DEFAULT '[]',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(tenant_id, template_name, language_code)
);
CREATE INDEX IF NOT EXISTS idx_meta_templates_tenant ON meta_templates(tenant_id);

ALTER TABLE meta_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mt_tenant" ON meta_templates;
CREATE POLICY "mt_tenant" ON meta_templates
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON meta_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meta_templates TO service_role;

ALTER TABLE conversas ADD COLUMN IF NOT EXISTS ultima_mensagem_lead_em timestamptz;

UPDATE conversas c
SET ultima_mensagem_lead_em = (
  SELECT MAX(m.created_at) FROM mensagens m
  WHERE m.conversa_id = c.id AND m.remetente = 'lead'
)
WHERE ultima_mensagem_lead_em IS NULL;
