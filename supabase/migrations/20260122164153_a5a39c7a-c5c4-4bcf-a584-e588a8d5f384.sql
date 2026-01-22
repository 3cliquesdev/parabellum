-- Tabela para salvar filtros personalizados de tickets
CREATE TABLE public.saved_ticket_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_ticket_filters ENABLE ROW LEVEL SECURITY;

-- Usuários podem gerenciar apenas seus próprios filtros
CREATE POLICY "Users can manage own saved ticket filters"
ON public.saved_ticket_filters FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_saved_ticket_filters_updated_at
  BEFORE UPDATE ON public.saved_ticket_filters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();