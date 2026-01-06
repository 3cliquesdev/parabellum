-- Adicionar coluna source na tabela ticket_comments
-- Valores possíveis: 'manual', 'email_reply', 'whatsapp', 'system'
ALTER TABLE public.ticket_comments 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.ticket_comments.source IS 'Origem do comentário: manual (agente), email_reply (resposta email cliente), whatsapp, system';