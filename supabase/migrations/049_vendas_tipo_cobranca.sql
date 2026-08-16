-- Distingue primeira cobranca de renovacao de assinatura, pra nao tratar
-- cliente antigo como lead novo. Preenchido pelo webhook da Kiwify a partir
-- de Subscription.charges.completed (ver src/app/api/webhooks/kiwify/route.ts).
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS tipo_cobranca text
  CHECK (tipo_cobranca IN ('nova', 'renovacao'));
