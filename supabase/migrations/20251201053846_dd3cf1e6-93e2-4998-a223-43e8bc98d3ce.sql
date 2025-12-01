-- FASE 1: Criar tabela kiwify_webhook_tokens para suportar múltiplos tokens
CREATE TABLE public.kiwify_webhook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ
);

-- Index para busca rápida de tokens ativos
CREATE INDEX idx_kiwify_webhook_tokens_active ON public.kiwify_webhook_tokens(is_active) WHERE is_active = true;

-- RLS: Apenas admin/manager podem gerenciar tokens
ALTER TABLE public.kiwify_webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage kiwify tokens"
  ON public.kiwify_webhook_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Inserir token inicial vky01n168f3
INSERT INTO public.kiwify_webhook_tokens (name, token, created_by)
VALUES ('Token Principal', 'vky01n168f3', (SELECT id FROM auth.users WHERE email = 'ronildo@liberty.com' LIMIT 1));