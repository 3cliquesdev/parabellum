-- Mais um gap do 002-009: conversas.ai_mode e ai_suggestion sao referenciados
-- no codigo (inbound-automation.ts, service.ts, useConversas.ts, dispatch.ts)
-- mas nunca existiram em nenhuma migration.
--
-- Default 'disabled': como o agente de IA principal agora roda no n8n
-- (via webhook message.received), a IA interna do CRM (chat_flows/Gemini)
-- fica desligada por padrao pra nao competir e responder em duplicidade.

ALTER TABLE conversas
  ADD COLUMN IF NOT EXISTS ai_mode text NOT NULL DEFAULT 'disabled'
    CHECK (ai_mode IN ('autopilot', 'copilot', 'disabled')),
  ADD COLUMN IF NOT EXISTS ai_suggestion text;

-- Canal de chat do site (widget publico, sem numero de WhatsApp).
ALTER TABLE conversas DROP CONSTRAINT IF EXISTS conversas_canal_check;
ALTER TABLE conversas ADD CONSTRAINT conversas_canal_check
  CHECK (canal IN ('whatsapp', 'email', 'instagram', 'telegram', 'facebook_messenger', 'webchat', 'interno'));

ALTER TABLE lead_identities DROP CONSTRAINT IF EXISTS lead_identities_canal_check;
ALTER TABLE lead_identities ADD CONSTRAINT lead_identities_canal_check
  CHECK (canal IN ('whatsapp', 'email', 'instagram', 'telegram', 'facebook_messenger', 'webchat'));
