-- Adicionar ação send_email_to_customer ao ENUM automation_action
ALTER TYPE automation_action ADD VALUE IF NOT EXISTS 'send_email_to_customer';

-- Criar tabela email_templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  trigger_type TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: todos autenticados podem ver, apenas admin/manager podem criar/editar
CREATE POLICY "authenticated_can_view_email_templates"
ON public.email_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admins_managers_can_manage_email_templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates pré-configurados
INSERT INTO public.email_templates (name, subject, html_body, trigger_type, variables) VALUES
(
  'Negócio Ganho - Parabéns',
  'Parabéns! Seu negócio foi fechado 🎉',
  '<h1>Parabéns, {{customer_name}}!</h1>
<p>É com grande alegria que informamos que o negócio <strong>{{deal_title}}</strong> foi fechado com sucesso!</p>
<p><strong>Valor:</strong> {{deal_value}} {{deal_currency}}</p>
<p>Estamos muito felizes em tê-lo como cliente e ansiosos para começar nossa parceria.</p>
<p>Em breve nossa equipe entrará em contato para os próximos passos.</p>
<p>Atenciosamente,<br>Equipe de Vendas</p>',
  'deal_won',
  '["customer_name", "deal_title", "deal_value", "deal_currency"]'::jsonb
),
(
  'Negócio Criado - Boas-vindas',
  'Bem-vindo! Recebemos sua proposta 👋',
  '<h1>Olá, {{customer_name}}!</h1>
<p>Obrigado por entrar em contato conosco!</p>
<p>Criamos uma proposta para você: <strong>{{deal_title}}</strong></p>
<p><strong>Valor estimado:</strong> {{deal_value}} {{deal_currency}}</p>
<p>Nossa equipe de vendas irá analisar sua solicitação e retornar em breve com mais detalhes.</p>
<p>Se tiver alguma dúvida, não hesite em nos contatar!</p>
<p>Atenciosamente,<br>Equipe Comercial</p>',
  'deal_created',
  '["customer_name", "deal_title", "deal_value", "deal_currency"]'::jsonb
),
(
  'Contato Criado - Boas-vindas',
  'Bem-vindo ao nosso CRM! 🚀',
  '<h1>Olá, {{customer_name}}!</h1>
<p>Seja muito bem-vindo!</p>
<p>Você foi adicionado ao nosso sistema e em breve nossa equipe entrará em contato.</p>
<p>Estamos ansiosos para conhecer suas necessidades e oferecer a melhor solução para você.</p>
<p>Atenciosamente,<br>Equipe Comercial</p>',
  'contact_created',
  '["customer_name"]'::jsonb
),
(
  'Negócio Perdido - Agradecimento',
  'Obrigado pelo seu tempo',
  '<h1>Olá, {{customer_name}}</h1>
<p>Agradecemos pelo seu interesse em nossos serviços.</p>
<p>Infelizmente, não foi possível avançar com o negócio <strong>{{deal_title}}</strong> neste momento.</p>
<p>Entendemos que a decisão pode ter sido difícil e respeitamos sua escolha.</p>
<p>Caso suas necessidades mudem no futuro, ficaremos felizes em retomar nossa conversa.</p>
<p>Atenciosamente,<br>Equipe de Vendas</p>',
  'deal_lost',
  '["customer_name", "deal_title"]'::jsonb
);