-- Adicionar campos para Deals sem contact_id (Leads que ainda não são clientes)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_email TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_phone TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_whatsapp_id TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_source TEXT; -- 'whatsapp' ou 'web_chat'

-- Índice para buscar deals por email de lead
CREATE INDEX IF NOT EXISTS idx_deals_lead_email ON deals(lead_email) WHERE lead_email IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN deals.lead_email IS 'Email do lead quando deal é criado sem contact_id (visitante que não é cliente)';
COMMENT ON COLUMN deals.lead_phone IS 'Telefone do lead quando deal é criado sem contact_id';
COMMENT ON COLUMN deals.lead_whatsapp_id IS 'WhatsApp ID do lead quando deal é criado sem contact_id';
COMMENT ON COLUMN deals.lead_source IS 'Origem do lead: whatsapp ou web_chat';