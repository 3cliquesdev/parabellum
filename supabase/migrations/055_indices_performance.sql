-- Indices que faltavam pros filtros mais comuns do app - sem eles, toda
-- consulta de negocios/conversas/mensagens era full scan. Nao mudam
-- comportamento, so performance (essencial conforme a base cresce).
CREATE INDEX IF NOT EXISTS idx_negocios_tenant_pipeline_created ON negocios(tenant_id, pipeline_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_negocios_tenant_etapa ON negocios(tenant_id, pipeline_etapa_id);
CREATE INDEX IF NOT EXISTS idx_conversas_tenant_updated ON conversas(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_created ON mensagens(conversa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_lead_status ON vendas(lead_id, status) WHERE lead_id IS NOT NULL;
