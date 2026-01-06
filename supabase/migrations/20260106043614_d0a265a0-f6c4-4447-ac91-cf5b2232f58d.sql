-- Add columns for pending payment validation flow
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS pending_payment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pending_kiwify_event_id UUID,
ADD COLUMN IF NOT EXISTS is_organic_sale BOOLEAN DEFAULT FALSE;

-- Add foreign key for kiwify_event reference
ALTER TABLE public.deals
ADD CONSTRAINT deals_pending_kiwify_event_id_fkey 
FOREIGN KEY (pending_kiwify_event_id) 
REFERENCES public.kiwify_events(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.deals.pending_payment_at IS 'Timestamp de quando pagamento foi detectado. Vendedor tem 30 min para validar.';
COMMENT ON COLUMN public.deals.pending_kiwify_event_id IS 'ID do kiwify_event aguardando validação do vendedor.';
COMMENT ON COLUMN public.deals.is_organic_sale IS 'True se cliente pagou sozinho (sem intervenção do vendedor).';

-- Create index for CRON job performance
CREATE INDEX IF NOT EXISTS idx_deals_pending_payment 
ON public.deals (pending_payment_at) 
WHERE pending_payment_at IS NOT NULL AND status = 'open';