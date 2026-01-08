-- Adicionar coluna para guardar agente anterior (para redistribuição)
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS previous_agent_id UUID REFERENCES public.profiles(id);

-- Comentário explicativo
COMMENT ON COLUMN public.conversations.previous_agent_id IS 'Guarda o agente anterior antes de redistribuição (fora do expediente, etc.)';

-- Criar índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_conversations_previous_agent_id ON public.conversations(previous_agent_id);

-- Adicionar valor 'waiting_human' ao enum ai_mode se não existir
DO $$
BEGIN
    -- Verificar se o valor já existe no enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'ai_mode'::regtype 
        AND enumlabel = 'waiting_human'
    ) THEN
        ALTER TYPE ai_mode ADD VALUE 'waiting_human';
    END IF;
END $$;