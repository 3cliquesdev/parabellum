-- ===================================================================
-- LIMPEZA DE CONVERSAS DUPLICADAS (Singleton Conversation)
-- ===================================================================
-- 
-- Este script fecha conversas duplicadas do mesmo cliente, mantendo
-- apenas a conversa mais recente (baseado em last_message_at).
-- ===================================================================

-- Fechar conversas duplicadas (manter apenas a mais recente por contact_id)
WITH ranked_conversations AS (
  SELECT 
    conv.id,
    conv.contact_id,
    ROW_NUMBER() OVER (
      PARTITION BY conv.contact_id 
      ORDER BY conv.last_message_at DESC NULLS LAST, conv.created_at DESC
    ) as rn
  FROM conversations conv
  WHERE conv.status = 'open'
),
duplicates_to_close AS (
  SELECT id 
  FROM ranked_conversations 
  WHERE rn > 1
)

UPDATE conversations 
SET 
  status = 'closed',
  closed_at = NOW(),
  auto_closed = true
WHERE id IN (SELECT id FROM duplicates_to_close);

-- ===================================================================
-- RESULTADO ESPERADO: ~8 conversas duplicadas serão fechadas
-- ===================================================================