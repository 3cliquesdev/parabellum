-- Criar tipos ENUM para automações
CREATE TYPE public.automation_trigger AS ENUM (
  'deal_created',
  'deal_won',
  'deal_lost',
  'deal_stage_changed',
  'activity_overdue',
  'contact_created',
  'contact_inactive'
);

CREATE TYPE public.automation_action AS ENUM (
  'assign_to_user',
  'create_activity',
  'add_tag',
  'send_notification',
  'change_status'
);

-- Criar tabela de automações
CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event automation_trigger NOT NULL,
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  action_type automation_action NOT NULL,
  action_config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de logs de execução
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
  trigger_data JSONB NOT NULL,
  execution_status TEXT NOT NULL, -- 'success', 'error', 'skipped'
  execution_result JSONB,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies para automations
CREATE POLICY "admins_managers_can_manage_automations"
ON public.automations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "sales_rep_can_view_automations"
ON public.automations
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies para automation_logs
CREATE POLICY "admins_managers_can_view_logs"
ON public.automation_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Criar trigger para updated_at
CREATE TRIGGER update_automations_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para performance
CREATE INDEX idx_automations_active ON public.automations(is_active) WHERE is_active = true;
CREATE INDEX idx_automations_trigger_event ON public.automations(trigger_event);
CREATE INDEX idx_automation_logs_automation_id ON public.automation_logs(automation_id);
CREATE INDEX idx_automation_logs_executed_at ON public.automation_logs(executed_at DESC);

-- Inserir automações pré-configuradas
INSERT INTO public.automations (name, description, trigger_event, trigger_conditions, action_type, action_config, is_active) VALUES
(
  'Auto-assign Leads Round Robin',
  'Distribui novos leads automaticamente entre vendedores usando round robin',
  'deal_created',
  '{"pipeline_id": null}'::jsonb,
  'assign_to_user',
  '{"strategy": "round_robin", "department": "comercial"}'::jsonb,
  false
),
(
  'Follow-up Pós-Venda',
  'Cria automaticamente uma atividade de follow-up 7 dias após deal ganho',
  'deal_won',
  '{}'::jsonb,
  'create_activity',
  '{"type": "meeting", "title": "Follow-up Pós-Venda", "description": "Verificar satisfação do cliente", "days_offset": 7}'::jsonb,
  false
),
(
  'Tag High Value',
  'Adiciona tag "High Value" em deals acima de R$ 50.000',
  'deal_created',
  '{"value_gte": 50000}'::jsonb,
  'add_tag',
  '{"tag_name": "High Value", "tag_color": "#10B981"}'::jsonb,
  false
),
(
  'Alerta Atividade Vencida',
  'Notifica vendedor quando atividade está vencida',
  'activity_overdue',
  '{}'::jsonb,
  'send_notification',
  '{"message": "Você tem uma atividade vencida que precisa de atenção"}'::jsonb,
  false
),
(
  'Reengajamento Lead Inativo',
  'Cria tarefa de reengajamento para contatos inativos há mais de 30 dias',
  'contact_inactive',
  '{"days_inactive": 30}'::jsonb,
  'create_activity',
  '{"type": "call", "title": "Reengajar Lead Inativo", "description": "Tentar reativar contato", "days_offset": 0}'::jsonb,
  false
);