-- Canal de aquisicao real do lead (kiwify/whatsapp/webchat/instagram/...),
-- gravado so na criacao - fecha o buraco de nao dar pra saber de onde um
-- lead veio quando formos fazer relatorio de aquisicao por canal.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS origem_lead text;

-- CPF e endereco completo - a Kiwify manda isso em todo Customer do webhook
-- (confirmado inspecionando vendas.raw_payload real), mas nada disso era
-- salvo. So preenchidos quando o campo do lead ainda esta vazio (ver
-- syncLeadExtraFields em src/lib/inbox/service.ts) - nunca sobrescreve dado
-- ja existente no CRM.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS endereco_rua text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS endereco_numero text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS endereco_complemento text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS endereco_bairro text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS endereco_cidade text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS endereco_estado text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS endereco_cep text;

CREATE INDEX IF NOT EXISTS idx_leads_cpf ON leads(tenant_id, cpf) WHERE cpf IS NOT NULL;
