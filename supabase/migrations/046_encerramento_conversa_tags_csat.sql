-- Encerramento de conversa com tag obrigatoria + pesquisa de satisfacao (CSAT),
-- incluindo encerramento automatico por inatividade decidido pela propria IA.

ALTER TABLE conversas ADD COLUMN IF NOT EXISTS resolvido_por text CHECK (resolvido_por IN ('ia', 'humano'));
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS resolvido_em timestamptz;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS aguardando_csat boolean NOT NULL DEFAULT false;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS csat_enviado_em timestamptz;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS ia_ultimo_departamento text;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS timeout_disparado_em timestamptz;

CREATE TABLE IF NOT EXISTS conversation_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversa_id, tag_id)
);

ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_tags_tenant" ON conversation_tags;
CREATE POLICY "conversation_tags_tenant" ON conversation_tags
  FOR ALL TO authenticated
  USING (conversa_id IN (SELECT id FROM conversas WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())))
  WITH CHECK (conversa_id IN (SELECT id FROM conversas WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));
GRANT ALL ON conversation_tags TO authenticated;
GRANT ALL ON conversation_tags TO service_role;

CREATE TABLE IF NOT EXISTS conversation_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  lead_id     uuid REFERENCES leads(id) ON DELETE SET NULL,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text text,
  canal       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_ratings_tenant ON conversation_ratings(tenant_id, created_at);

ALTER TABLE conversation_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_ratings_tenant" ON conversation_ratings;
CREATE POLICY "conversation_ratings_tenant" ON conversation_ratings
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON conversation_ratings TO authenticated;
GRANT ALL ON conversation_ratings TO service_role;

-- Seed das tags reais de encerramento de conversa (portadas da Parabellum/Lovable,
-- mesmo tipo de operacao de dropshipping/e-commerce).
DO $$
DECLARE
  v_tenant_id uuid := '1d47398e-9d3a-46b2-ac76-b0a3ca09afc4';
BEGIN
  INSERT INTO tags (tenant_id, nome, cor) VALUES
    (v_tenant_id, '1.01 Duvidas gerais', '#22C55E'),
    (v_tenant_id, '1.02 Duvidas sobre planos disponiveis', '#22C55E'),
    (v_tenant_id, '2.01 Onboarding', '#22C55E'),
    (v_tenant_id, '3.01 Loja nova com erro - Cliente Creation', '#22C55E'),
    (v_tenant_id, '3.02 Falha de atendimento de suporte', '#22C55E'),
    (v_tenant_id, '3.03 Duvidas gerais sobre a plataforma', '#22C55E'),
    (v_tenant_id, '3.04 Duvidas sobre informacoes de produto', '#22C55E'),
    (v_tenant_id, '3.05 Pedido com informacoes incompletas', '#22C55E'),
    (v_tenant_id, '3.06 Problema de sincronizacao do pedido no sistema', '#22C55E'),
    (v_tenant_id, '3.07 Solicitacao de inativacao do produto ou sku', '#22C55E'),
    (v_tenant_id, '3.08 Aguardando Aprovacao de Saldo', '#22C55E'),
    (v_tenant_id, '3.09 Confirmacao de estoque', '#22C55E'),
    (v_tenant_id, '3.10 Dificuldades de uso na plataforma', '#22C55E'),
    (v_tenant_id, '3.11 Dificuldade em publicar produto', '#22C55E'),
    (v_tenant_id, '3.12 Pedido nao pago por falha', '#22C55E'),
    (v_tenant_id, '4.01 Erro de comunicacao do estoque', '#22C55E'),
    (v_tenant_id, '4.02 Erro de endereco', '#22C55E'),
    (v_tenant_id, '4.03 Erro ou alteracao de produto/sku', '#22C55E'),
    (v_tenant_id, '4.04 Cancelamento de pedido', '#22C55E'),
    (v_tenant_id, '5.01 Informacoes sobre entrega', '#22C55E'),
    (v_tenant_id, '5.02 Informacoes sobre Devolucoes', '#3B82F6'),
    (v_tenant_id, '6.01 Defeito no produto', '#22C55E'),
    (v_tenant_id, '6.02 Envio errado de produto ou falta de item', '#22C55E'),
    (v_tenant_id, '6.03 Divergencia ou insucesso entrega', '#22C55E'),
    (v_tenant_id, '6.04 Desistencia de pedido', '#22C55E'),
    (v_tenant_id, '6.05 Saque do saldo', '#22C55E'),
    (v_tenant_id, '7.01 Cancelamento de assinatura', '#22C55E'),
    (v_tenant_id, '7.02 Reembolso de assinatura', '#22C55E'),
    (v_tenant_id, '7.03 Cliente de recuperacao', '#22C55E'),
    (v_tenant_id, '9.01 Solicitacao de nota fiscal', '#22C55E'),
    (v_tenant_id, '9.02 Erro de bot', '#22C55E'),
    (v_tenant_id, '9.03 Interacao de instagram', '#22C55E'),
    (v_tenant_id, '9.04 Desistencia da conversa', '#94a3b8'),
    (v_tenant_id, '9.05 Atendimento Fora do Horario', '#3B82F6'),
    (v_tenant_id, '9.98 Falta de Interacao', '#22C55E'),
    (v_tenant_id, '9.99 Outras', '#22C55E')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
END $$;

ALTER TABLE conversas ADD COLUMN IF NOT EXISTS ultima_resposta_ia_em timestamptz;
