-- Tabela de fluxos de chat interativos (estilo Octadesk/Blip)
CREATE TABLE IF NOT EXISTS public.chat_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  triggers TEXT[] DEFAULT '{}',
  trigger_keywords TEXT[] DEFAULT '{}',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  support_channel_id UUID REFERENCES public.support_channels(id) ON DELETE SET NULL,
  flow_definition JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estado do fluxo por conversa (rastreamento de progresso)
CREATE TABLE IF NOT EXISTS public.chat_flow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES public.chat_flows(id) ON DELETE CASCADE,
  current_node_id TEXT NOT NULL,
  collected_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'transferred')),
  CONSTRAINT unique_active_flow UNIQUE (conversation_id, flow_id, status)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_flows_active ON public.chat_flows(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chat_flows_triggers ON public.chat_flows USING GIN(triggers);
CREATE INDEX IF NOT EXISTS idx_chat_flows_keywords ON public.chat_flows USING GIN(trigger_keywords);
CREATE INDEX IF NOT EXISTS idx_chat_flow_states_conversation ON public.chat_flow_states(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_flow_states_active ON public.chat_flow_states(conversation_id, status) WHERE status = 'active';

-- Habilitar RLS
ALTER TABLE public.chat_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_flow_states ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_flows (admin/manager podem gerenciar)
CREATE POLICY "Admins and managers can manage chat flows"
ON public.chat_flows
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Políticas RLS para chat_flow_states (usuários autenticados podem gerenciar estados)
CREATE POLICY "Authenticated users can manage flow states"
ON public.chat_flow_states
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_chat_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_chat_flows_updated_at ON public.chat_flows;
CREATE TRIGGER trigger_chat_flows_updated_at
BEFORE UPDATE ON public.chat_flows
FOR EACH ROW EXECUTE FUNCTION update_chat_flows_updated_at();

-- Habilitar realtime para states (para updates em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_flow_states;