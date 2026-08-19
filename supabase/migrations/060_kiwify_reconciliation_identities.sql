-- Identificadores normalizados da Kiwify permitem reconciliacao silenciosa
-- por telefone, e-mail e CPF sem varrer o JSON bruto de cada venda.
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS buyer_email_normalized text,
  ADD COLUMN IF NOT EXISTS buyer_cpf_normalized text;

UPDATE public.vendas
SET
  buyer_email_normalized = lower(nullif(trim(coalesce(raw_payload->'Customer'->>'email', raw_payload->>'email')), '')),
  buyer_cpf_normalized = nullif(regexp_replace(coalesce(raw_payload->'Customer'->>'CPF', raw_payload->'Customer'->>'cpf', raw_payload->>'cpf', ''), '\D', '', 'g'), '')
WHERE origem = 'kiwify'
  AND (buyer_email_normalized IS NULL OR buyer_cpf_normalized IS NULL);

CREATE INDEX IF NOT EXISTS idx_vendas_kiwify_paid_email
  ON public.vendas (tenant_id, buyer_email_normalized)
  WHERE origem = 'kiwify' AND status = 'pago' AND buyer_email_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendas_kiwify_paid_cpf
  ON public.vendas (tenant_id, buyer_cpf_normalized)
  WHERE origem = 'kiwify' AND status = 'pago' AND buyer_cpf_normalized IS NOT NULL;
