-- 1. Adicionar colunas de correlação playbook
ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS playbook_execution_id uuid,
  ADD COLUMN IF NOT EXISTS playbook_node_id text;

-- 2. Índice para busca eficiente no condition  
CREATE INDEX IF NOT EXISTS idx_email_sends_playbook_exec_node
  ON public.email_sends(playbook_execution_id, playbook_node_id)
  WHERE playbook_execution_id IS NOT NULL;

-- 3. Índice único para resend_email_id (idempotência)
CREATE UNIQUE INDEX IF NOT EXISTS email_sends_resend_email_id_uidx
  ON public.email_sends(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

-- 4. Índice para otimizar claim da fila
CREATE INDEX IF NOT EXISTS idx_playbook_queue_pending_sched
  ON public.playbook_execution_queue(status, scheduled_for)
  WHERE status = 'pending';

-- 5. Função para lock atômico via CTE
CREATE OR REPLACE FUNCTION public.claim_playbook_queue_items(batch_size int DEFAULT 10)
RETURNS SETOF public.playbook_execution_queue
LANGUAGE sql
AS $$
  WITH picked AS (
    SELECT id
    FROM public.playbook_execution_queue
    WHERE status = 'pending'
      AND scheduled_for <= now()
    ORDER BY scheduled_for, id
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.playbook_execution_queue q
  SET status = 'processing'
  FROM picked
  WHERE q.id = picked.id
  RETURNING q.*;
$$;

-- 6. Restringir acesso à função apenas para service_role
REVOKE ALL ON FUNCTION public.claim_playbook_queue_items(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_playbook_queue_items(int) TO service_role;