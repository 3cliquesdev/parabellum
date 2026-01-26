-- Tabela para instâncias Meta WhatsApp Cloud API
CREATE TABLE public.whatsapp_meta_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  verify_token TEXT NOT NULL,
  app_secret TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  webhook_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_meta_instances ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (apenas admins podem gerenciar) usando user_roles
CREATE POLICY "Admins can manage meta instances"
ON public.whatsapp_meta_instances
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'general_manager')
  )
);

-- Adicionar coluna provider na tabela conversations para distinguir origem
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT DEFAULT 'evolution';

-- Adicionar referência para instância Meta nas conversas
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS whatsapp_meta_instance_id UUID REFERENCES public.whatsapp_meta_instances(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_provider ON public.conversations(whatsapp_provider);
CREATE INDEX IF NOT EXISTS idx_conversations_meta_instance ON public.conversations(whatsapp_meta_instance_id);
CREATE INDEX IF NOT EXISTS idx_meta_instances_phone_number_id ON public.whatsapp_meta_instances(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_meta_instances_status ON public.whatsapp_meta_instances(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_meta_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_meta_instances_updated_at
BEFORE UPDATE ON public.whatsapp_meta_instances
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_meta_instances_updated_at();