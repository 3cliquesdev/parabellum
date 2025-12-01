-- Create system_configurations table for centralized settings management
CREATE TABLE IF NOT EXISTS public.system_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'email', 'webhook', 'integration', 'api'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_configurations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage configurations
CREATE POLICY "admins_can_manage_configurations"
ON public.system_configurations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Seed initial configurations
INSERT INTO public.system_configurations (key, value, description, category) VALUES
('email_sender_customer', 'Seu Armazém Drop <contato@parabellum.work>', 'Remetente para emails de clientes', 'email'),
('email_sender_employee', 'PARABELLUM | 3Cliques <noreply@parabellum.work>', 'Remetente para emails internos', 'email'),
('email_verified_domain', 'parabellum.work', 'Domínio verificado no Resend', 'email'),
('evolution_api_base_url', 'https://sua-evolution-api.com', 'URL base da Evolution API', 'integration'),
('kiwify_webhook_url', 'https://zaeozfdjhrmblfaxsyuu.supabase.co/functions/v1/kiwify-webhook', 'URL do webhook Kiwify', 'webhook'),
('whatsapp_webhook_url', 'https://zaeozfdjhrmblfaxsyuu.supabase.co/functions/v1/handle-whatsapp-event', 'URL do webhook WhatsApp Evolution', 'webhook'),
('email_webhook_url', 'https://zaeozfdjhrmblfaxsyuu.supabase.co/functions/v1/email-webhook', 'URL do webhook Email Resend', 'webhook')
ON CONFLICT (key) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_system_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER system_configurations_updated_at
BEFORE UPDATE ON public.system_configurations
FOR EACH ROW
EXECUTE FUNCTION update_system_configurations_updated_at();