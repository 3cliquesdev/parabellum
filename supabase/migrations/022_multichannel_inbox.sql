-- Inbox multicanal: identidades por lead, metadata de mensagens e canais adicionais

ALTER TABLE public.conversas
  DROP CONSTRAINT IF EXISTS conversas_canal_check;

ALTER TABLE public.conversas
  ADD CONSTRAINT conversas_canal_check
  CHECK (canal IN ('whatsapp', 'email', 'instagram', 'telegram', 'facebook_messenger', 'interno'));

ALTER TABLE public.mensagens
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_mensagens_external_message_id
  ON public.mensagens (external_message_id);

CREATE TABLE IF NOT EXISTS public.lead_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  canal text NOT NULL CHECK (canal IN ('whatsapp', 'email', 'instagram', 'telegram', 'facebook_messenger')),
  valor text,
  valor_normalizado text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_identities_any_identifier CHECK (valor IS NOT NULL OR external_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_identities_normalized_unique
  ON public.lead_identities (tenant_id, canal, valor_normalizado)
  WHERE valor_normalizado IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_identities_external_unique
  ON public.lead_identities (tenant_id, canal, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_identities_lead
  ON public.lead_identities (lead_id);

ALTER TABLE public.lead_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_identities_tenant_select" ON public.lead_identities;
CREATE POLICY "lead_identities_tenant_select" ON public.lead_identities
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "lead_identities_tenant_insert" ON public.lead_identities;
CREATE POLICY "lead_identities_tenant_insert" ON public.lead_identities
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "lead_identities_tenant_update" ON public.lead_identities;
CREATE POLICY "lead_identities_tenant_update" ON public.lead_identities
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "lead_identities_tenant_delete" ON public.lead_identities;
CREATE POLICY "lead_identities_tenant_delete" ON public.lead_identities
  FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.sync_lead_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_whatsapp text;
  normalized_email text;
  normalized_instagram text;
BEGIN
  normalized_whatsapp := NULLIF(regexp_replace(coalesce(NEW.whatsapp, ''), '\D', '', 'g'), '');
  IF normalized_whatsapp IS NOT NULL AND left(normalized_whatsapp, 2) = '55' AND length(normalized_whatsapp) > 11 THEN
    normalized_whatsapp := substring(normalized_whatsapp FROM 3);
  END IF;

  normalized_email := NULLIF(lower(trim(coalesce(NEW.email, ''))), '');
  normalized_instagram := NULLIF(lower(ltrim(trim(coalesce(NEW.instagram, '')), '@')), '');

  IF normalized_whatsapp IS NOT NULL THEN
    INSERT INTO public.lead_identities (tenant_id, lead_id, canal, valor, valor_normalizado, updated_at)
    VALUES (NEW.tenant_id, NEW.id, 'whatsapp', NEW.whatsapp, normalized_whatsapp, now())
    ON CONFLICT (tenant_id, canal, valor_normalizado)
    DO UPDATE SET
      lead_id = EXCLUDED.lead_id,
      valor = EXCLUDED.valor,
      updated_at = now();
  ELSE
    DELETE FROM public.lead_identities
    WHERE lead_id = NEW.id AND canal = 'whatsapp' AND external_id IS NULL;
  END IF;

  IF normalized_email IS NOT NULL THEN
    INSERT INTO public.lead_identities (tenant_id, lead_id, canal, valor, valor_normalizado, updated_at)
    VALUES (NEW.tenant_id, NEW.id, 'email', NEW.email, normalized_email, now())
    ON CONFLICT (tenant_id, canal, valor_normalizado)
    DO UPDATE SET
      lead_id = EXCLUDED.lead_id,
      valor = EXCLUDED.valor,
      updated_at = now();
  ELSE
    DELETE FROM public.lead_identities
    WHERE lead_id = NEW.id AND canal = 'email' AND external_id IS NULL;
  END IF;

  IF normalized_instagram IS NOT NULL THEN
    INSERT INTO public.lead_identities (tenant_id, lead_id, canal, valor, valor_normalizado, updated_at)
    VALUES (NEW.tenant_id, NEW.id, 'instagram', NEW.instagram, normalized_instagram, now())
    ON CONFLICT (tenant_id, canal, valor_normalizado)
    DO UPDATE SET
      lead_id = EXCLUDED.lead_id,
      valor = EXCLUDED.valor,
      updated_at = now();
  ELSE
    DELETE FROM public.lead_identities
    WHERE lead_id = NEW.id AND canal = 'instagram' AND external_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_identity_columns ON public.leads;
CREATE TRIGGER trg_sync_lead_identity_columns
AFTER INSERT OR UPDATE OF whatsapp, email, instagram ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_lead_identity_columns();

INSERT INTO public.lead_identities (tenant_id, lead_id, canal, valor, valor_normalizado)
SELECT
  tenant_id,
  id,
  'whatsapp',
  whatsapp,
  CASE
    WHEN left(regexp_replace(whatsapp, '\D', '', 'g'), 2) = '55' AND length(regexp_replace(whatsapp, '\D', '', 'g')) > 11
      THEN substring(regexp_replace(whatsapp, '\D', '', 'g') FROM 3)
    ELSE regexp_replace(whatsapp, '\D', '', 'g')
  END
FROM public.leads
WHERE whatsapp IS NOT NULL AND trim(whatsapp) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO public.lead_identities (tenant_id, lead_id, canal, valor, valor_normalizado)
SELECT tenant_id, id, 'email', email, lower(trim(email))
FROM public.leads
WHERE email IS NOT NULL AND trim(email) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO public.lead_identities (tenant_id, lead_id, canal, valor, valor_normalizado)
SELECT tenant_id, id, 'instagram', instagram, lower(ltrim(trim(instagram), '@'))
FROM public.leads
WHERE instagram IS NOT NULL AND trim(instagram) <> ''
ON CONFLICT DO NOTHING;

GRANT ALL PRIVILEGES ON TABLE public.lead_identities TO service_role;
GRANT ALL PRIVILEGES ON FUNCTION public.sync_lead_identity_columns() TO service_role;
