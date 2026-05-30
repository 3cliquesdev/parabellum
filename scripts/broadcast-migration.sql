-- Sprint 1: Broadcast tables

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
CREATE POLICY "mt_tenant" ON meta_templates FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON meta_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meta_templates TO service_role;

CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by          uuid REFERENCES auth.users(id),
  nome                text NOT NULL,
  descricao           text,
  template_id         uuid REFERENCES meta_templates(id),
  template_variables  jsonb NOT NULL DEFAULT '{}',
  segmento_filtros    jsonb NOT NULL DEFAULT '{}',
  status              text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','validando','agendado','enviando','pausado','concluido','cancelado','falhou')),
  total_destinatarios int DEFAULT 0,
  total_enfileirados  int DEFAULT 0,
  total_enviados      int DEFAULT 0,
  total_entregues     int DEFAULT 0,
  total_lidos         int DEFAULT 0,
  total_respondidos   int DEFAULT 0,
  total_falhas        int DEFAULT 0,
  total_optouts       int DEFAULT 0,
  agendado_para       timestamptz,
  iniciado_em         timestamptz,
  concluido_em        timestamptz,
  pausado_em          timestamptz,
  pausado_motivo      text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bc_tenant ON broadcast_campaigns(tenant_id);
ALTER TABLE broadcast_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_tenant" ON broadcast_campaigns FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON broadcast_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON broadcast_campaigns TO service_role;

CREATE TABLE IF NOT EXISTS broadcast_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id           uuid REFERENCES leads(id) ON DELETE SET NULL,
  phone_number      text NOT NULL,
  variables_filled  jsonb NOT NULL DEFAULT '{}',
  meta_message_id   text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','delivered','read','failed','optout')),
  error_code        text,
  error_message     text,
  enqueued_at       timestamptz DEFAULT now(),
  sent_at           timestamptz,
  delivered_at      timestamptz,
  read_at           timestamptz,
  failed_at         timestamptz,
  attempts          int DEFAULT 0,
  next_retry_at     timestamptz,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bm_campaign ON broadcast_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bm_meta_id ON broadcast_messages(meta_message_id) WHERE meta_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bm_status ON broadcast_messages(campaign_id, status);
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bm_tenant" ON broadcast_messages FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON broadcast_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON broadcast_messages TO service_role;

CREATE TABLE IF NOT EXISTS lead_optouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number  text NOT NULL,
  lead_id       uuid REFERENCES leads(id) ON DELETE SET NULL,
  source        text NOT NULL CHECK (source IN ('keyword','button','manual','meta_block')),
  source_message text,
  campaign_id   uuid REFERENCES broadcast_campaigns(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(tenant_id, phone_number)
);
CREATE INDEX IF NOT EXISTS idx_lo_tenant_phone ON lead_optouts(tenant_id, phone_number);
ALTER TABLE lead_optouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lo_tenant" ON lead_optouts FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON lead_optouts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lead_optouts TO service_role;

CREATE TABLE IF NOT EXISTS meta_phone_quality (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  messaging_tier  int NOT NULL DEFAULT 1,
  daily_limit     int NOT NULL DEFAULT 1000,
  used_today      int NOT NULL DEFAULT 0,
  reset_at        timestamptz NOT NULL DEFAULT (date_trunc('day', now()) + interval '1 day'),
  quality_rating  text CHECK (quality_rating IN ('GREEN','YELLOW','RED','UNKNOWN')) DEFAULT 'UNKNOWN',
  last_checked_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, phone_number_id)
);
ALTER TABLE meta_phone_quality ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpq_tenant" ON meta_phone_quality FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON meta_phone_quality TO authenticated;
GRANT SELECT, INSERT, UPDATE ON meta_phone_quality TO service_role;

CREATE TABLE IF NOT EXISTS broadcast_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
  message_id  uuid REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  event_data  jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bal_tenant ON broadcast_audit_log(tenant_id, created_at DESC);
ALTER TABLE broadcast_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bal_tenant" ON broadcast_audit_log FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT ON broadcast_audit_log TO authenticated;
GRANT SELECT, INSERT ON broadcast_audit_log TO service_role;

SELECT '6 tabelas broadcast criadas!' as resultado;
