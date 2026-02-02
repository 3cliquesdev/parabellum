-- Criar índice único para resend_email_id (permite consulta rápida por email_id do Resend)
CREATE UNIQUE INDEX IF NOT EXISTS email_sends_resend_email_id_uidx 
  ON public.email_sends(resend_email_id) 
  WHERE resend_email_id IS NOT NULL;