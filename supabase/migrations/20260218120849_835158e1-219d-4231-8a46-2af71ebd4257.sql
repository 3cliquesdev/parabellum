
-- Tabela de templates HSM WhatsApp
CREATE TABLE public.whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_meta_instances(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT DEFAULT 'UTILITY',
  description TEXT,
  has_variables BOOLEAN DEFAULT false,
  variable_examples JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, name, language_code)
);

-- RLS
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
ON public.whatsapp_message_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert templates"
ON public.whatsapp_message_templates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update templates"
ON public.whatsapp_message_templates FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete templates"
ON public.whatsapp_message_templates FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_whatsapp_message_templates_updated_at
BEFORE UPDATE ON public.whatsapp_message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
