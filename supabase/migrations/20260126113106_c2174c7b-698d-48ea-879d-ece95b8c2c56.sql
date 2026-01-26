-- Adicionar coluna para rastrear quando handoff foi executado
-- Isso previne race conditions entre múltiplas chamadas do ai-autopilot-chat

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS handoff_executed_at TIMESTAMP WITH TIME ZONE;

-- Índice para consultas rápidas de handoffs recentes
CREATE INDEX IF NOT EXISTS idx_conversations_handoff_executed_at 
ON public.conversations(handoff_executed_at) 
WHERE handoff_executed_at IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.conversations.handoff_executed_at IS 'Timestamp do último handoff executado - usado para prevenir race conditions';