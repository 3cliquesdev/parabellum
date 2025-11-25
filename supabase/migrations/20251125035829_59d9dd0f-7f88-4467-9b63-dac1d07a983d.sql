-- Adicionar novos campos à tabela contacts para suportar importação completa do Excel

-- Campos de documento/fiscal
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS state_registration TEXT;

-- Campos de endereço detalhado
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Campos de gestão de cliente
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS customer_type TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;

-- Campos financeiros/plano
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS registration_date DATE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS next_payment_date DATE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS recent_orders_count INTEGER DEFAULT 0;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS account_balance NUMERIC DEFAULT 0;

-- Criar índices para campos frequentemente pesquisados
CREATE INDEX IF NOT EXISTS idx_contacts_document ON public.contacts(document);
CREATE INDEX IF NOT EXISTS idx_contacts_blocked ON public.contacts(blocked);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_type ON public.contacts(customer_type);

-- Comentários para documentação
COMMENT ON COLUMN public.contacts.document IS 'CPF ou CNPJ do cliente';
COMMENT ON COLUMN public.contacts.state_registration IS 'Inscrição Estadual (IE)';
COMMENT ON COLUMN public.contacts.address_number IS 'Número do endereço';
COMMENT ON COLUMN public.contacts.address_complement IS 'Complemento do endereço';
COMMENT ON COLUMN public.contacts.neighborhood IS 'Bairro';
COMMENT ON COLUMN public.contacts.customer_type IS 'Tipo de cliente (Vendedor, Cliente, Fornecedor, etc.)';
COMMENT ON COLUMN public.contacts.blocked IS 'Cliente bloqueado';
COMMENT ON COLUMN public.contacts.subscription_plan IS 'Plano de assinatura do cliente';
COMMENT ON COLUMN public.contacts.registration_date IS 'Data de cadastro original';
COMMENT ON COLUMN public.contacts.last_payment_date IS 'Data do último pagamento';
COMMENT ON COLUMN public.contacts.next_payment_date IS 'Data do próximo pagamento';
COMMENT ON COLUMN public.contacts.recent_orders_count IS 'Quantidade de pedidos recentes';
COMMENT ON COLUMN public.contacts.account_balance IS 'Saldo da conta do cliente';