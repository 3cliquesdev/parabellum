-- Subfase 7A: Estrutura de Dados (Activities Table)

-- Criar enum para tipos de atividade
CREATE TYPE public.activity_type AS ENUM ('call', 'meeting', 'email', 'task', 'lunch');

-- Criar tabela activities
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "role_based_select_activities"
ON public.activities
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (has_role(auth.uid(), 'sales_rep'::app_role) AND assigned_to = auth.uid())
);

CREATE POLICY "role_based_insert_activities"
ON public.activities
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (has_role(auth.uid(), 'sales_rep'::app_role) AND (assigned_to = auth.uid() OR assigned_to IS NULL))
);

CREATE POLICY "role_based_update_activities"
ON public.activities
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (has_role(auth.uid(), 'sales_rep'::app_role) AND assigned_to = auth.uid())
);

CREATE POLICY "role_based_delete_activities"
ON public.activities
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para registrar interação quando atividade é completada
CREATE OR REPLACE FUNCTION public.log_activity_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se a atividade foi marcada como completa (mudou de false para true)
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    -- Registrar timestamp de conclusão
    NEW.completed_at = NOW();
    
    -- Registrar interação na timeline
    IF NEW.contact_id IS NOT NULL THEN
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
        'Atividade completada: ' || NEW.title,
        'other',
        auth.uid(),
        jsonb_build_object(
          'activity_id', NEW.id,
          'activity_type', NEW.type,
          'completed_at', NEW.completed_at
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_activity_completion_trigger
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.log_activity_completion();

-- Índices para melhor performance
CREATE INDEX idx_activities_assigned_to ON public.activities(assigned_to);
CREATE INDEX idx_activities_contact_id ON public.activities(contact_id);
CREATE INDEX idx_activities_deal_id ON public.activities(deal_id);
CREATE INDEX idx_activities_due_date ON public.activities(due_date);
CREATE INDEX idx_activities_completed ON public.activities(completed);