-- Blindagem do fluxo de devolucao/reembolso/saque:
-- 1) devolucao fisica passa a gerar um ticket vinculado automaticamente (servidor,
--    nao a IA), pro time humano ver/agir na tela de tickets ja existente.
-- 2) vinculacao silenciosa telefone <-> cliente Kiwify: fecha o buraco que a propria
--    Parabellum documentou (so 1 de 4.581 devolucoes tinha contato vinculado, porque
--    a busca por telefone nunca existiu la).
-- 3) verificacao OTP por email, exigida so pra saque de saldo de carteira (dinheiro
--    real saindo via PIX) - reembolso Kiwify e devolucao fisica NAO exigem OTP.

-- Helper de normalizacao de telefone BR, reaproveitando a logica ja usada em
-- sync_lead_identity_columns (022_multichannel_inbox.sql), pra nao duplicar regra.
CREATE OR REPLACE FUNCTION public.normalize_phone_br(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  digits := NULLIF(regexp_replace(coalesce(raw, ''), '\D', '', 'g'), '');
  IF digits IS NOT NULL AND left(digits, 2) = '55' AND length(digits) > 11 THEN
    digits := substring(digits FROM 3);
  END IF;
  RETURN digits;
END;
$$;

-- 1) Devolucao <-> ticket
ALTER TABLE public.devolucoes
  ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL;

-- 2) Vinculacao telefone <-> cliente Kiwify
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS buyer_phone_normalized text;

CREATE INDEX IF NOT EXISTS idx_vendas_buyer_phone
  ON public.vendas (tenant_id, buyer_phone_normalized)
  WHERE buyer_phone_normalized IS NOT NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS eh_cliente boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.marcar_lead_como_cliente()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pago' AND NEW.lead_id IS NOT NULL THEN
    UPDATE public.leads SET eh_cliente = true, updated_at = now()
    WHERE id = NEW.lead_id AND eh_cliente = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marcar_lead_como_cliente ON public.vendas;
CREATE TRIGGER trg_marcar_lead_como_cliente
AFTER INSERT OR UPDATE OF status ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.marcar_lead_como_cliente();

-- Backfill: vendas ja pagas marcam o lead como cliente desde ja.
UPDATE public.leads l SET eh_cliente = true, updated_at = now()
WHERE eh_cliente = false
  AND EXISTS (SELECT 1 FROM public.vendas v WHERE v.lead_id = l.id AND v.status = 'pago');

-- 3) OTP por email, so pra acoes que exigirem (saque de saldo)
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS financeiro_verificado_em timestamptz;

CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id     uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  conversa_id uuid REFERENCES public.conversas(id) ON DELETE CASCADE,
  email       text NOT NULL,
  code        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  verified    boolean NOT NULL DEFAULT false,
  attempts    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_conversa ON public.otp_verifications(conversa_id, created_at DESC);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "otp_verifications_tenant" ON public.otp_verifications;
CREATE POLICY "otp_verifications_tenant" ON public.otp_verifications
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
GRANT SELECT ON public.otp_verifications TO authenticated;
GRANT ALL ON public.otp_verifications TO service_role;

-- 4) Categorias de ticket reais (nao mais ad hoc): devolucao fisica, reembolso
-- Kiwify (sem OTP), saque de carteira (com OTP).
ALTER TABLE public.ticket_categories
  ADD COLUMN IF NOT EXISTS requer_verificacao boolean NOT NULL DEFAULT false;

INSERT INTO public.ticket_categories (tenant_id, nome, cor, requer_verificacao)
VALUES
  ('1d47398e-9d3a-46b2-ac76-b0a3ca09afc4', 'Devolução - Produto Físico', '#f97316', false),
  ('1d47398e-9d3a-46b2-ac76-b0a3ca09afc4', 'Financeiro - Reembolso Kiwify', '#eab308', false),
  ('1d47398e-9d3a-46b2-ac76-b0a3ca09afc4', 'Financeiro - Saque de Carteira', '#ef4444', true)
ON CONFLICT (tenant_id, nome) DO NOTHING;
