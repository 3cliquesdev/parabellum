-- FASE 2: Customer Journey/Onboarding Track
-- Tabela para rastrear etapas do onboarding de clientes

CREATE TABLE IF NOT EXISTS public.customer_journey_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_journey_steps_contact_id ON public.customer_journey_steps(contact_id);
CREATE INDEX idx_journey_steps_completed ON public.customer_journey_steps(completed);
CREATE INDEX idx_journey_steps_position ON public.customer_journey_steps(position);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_customer_journey_steps_updated_at
  BEFORE UPDATE ON public.customer_journey_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para registrar timestamp de conclusão
CREATE OR REPLACE FUNCTION public.log_journey_step_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    NEW.completed_at = NOW();
    NEW.completed_by = auth.uid();
    
    -- Registrar interação na timeline do cliente
    INSERT INTO public.interactions (
      customer_id,
      type,
      content,
      channel,
      created_by,
      metadata
    ) VALUES (
      NEW.contact_id,
      'note',
      'Etapa de onboarding completada: ' || NEW.step_name,
      'other',
      auth.uid(),
      jsonb_build_object(
        'journey_step_id', NEW.id,
        'is_critical', NEW.is_critical,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_journey_step_completion_trigger
  BEFORE UPDATE ON public.customer_journey_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.log_journey_step_completion();

-- RLS Policies
ALTER TABLE public.customer_journey_steps ENABLE ROW LEVEL SECURITY;

-- Admin/Manager podem gerenciar todas as etapas
CREATE POLICY "admin_manager_can_manage_journey_steps"
  ON public.customer_journey_steps
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Sales rep pode visualizar e atualizar etapas de seus clientes
CREATE POLICY "sales_rep_can_view_own_journey_steps"
  ON public.customer_journey_steps
  FOR SELECT
  USING (
    has_role(auth.uid(), 'sales_rep'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = customer_journey_steps.contact_id
      AND c.assigned_to = auth.uid()
    )
  );

CREATE POLICY "sales_rep_can_update_own_journey_steps"
  ON public.customer_journey_steps
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'sales_rep'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = customer_journey_steps.contact_id
      AND c.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'sales_rep'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = customer_journey_steps.contact_id
      AND c.assigned_to = auth.uid()
    )
  );

-- Comentários para documentação
COMMENT ON TABLE public.customer_journey_steps IS 'Rastreamento de etapas do onboarding/jornada do cliente';
COMMENT ON COLUMN public.customer_journey_steps.is_critical IS 'Indica se a etapa é crítica/obrigatória para completar o onboarding';
COMMENT ON COLUMN public.customer_journey_steps.position IS 'Ordem sequencial da etapa no processo de onboarding';
COMMENT ON COLUMN public.customer_journey_steps.notes IS 'Observações adicionais sobre a etapa';