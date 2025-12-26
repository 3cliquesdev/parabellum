-- Adicionar coluna tracking_code na tabela deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);

-- Criar índice para buscas rápidas por tracking_code
CREATE INDEX IF NOT EXISTS idx_deals_tracking_code ON public.deals(tracking_code) WHERE tracking_code IS NOT NULL;

-- Criar tabela de cache de rastreio para evitar consultas repetidas ao MySQL externo
CREATE TABLE IF NOT EXISTS public.tracking_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code VARCHAR(100) NOT NULL,
  platform VARCHAR(50),
  status VARCHAR(50),
  external_created_at TIMESTAMP WITH TIME ZONE,
  external_updated_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tracking_code)
);

-- Índice para busca por tracking_code
CREATE INDEX IF NOT EXISTS idx_tracking_cache_code ON public.tracking_cache(tracking_code);

-- Índice para limpar cache antigo
CREATE INDEX IF NOT EXISTS idx_tracking_cache_fetched ON public.tracking_cache(fetched_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_tracking_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_tracking_cache_updated_at ON public.tracking_cache;
CREATE TRIGGER trigger_tracking_cache_updated_at
  BEFORE UPDATE ON public.tracking_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tracking_cache_updated_at();

-- RLS para tracking_cache (apenas usuários autenticados podem ver)
ALTER TABLE public.tracking_cache ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todos os caches
CREATE POLICY "Authenticated users can view tracking cache"
  ON public.tracking_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Service role pode inserir/atualizar (edge functions)
CREATE POLICY "Service role can manage tracking cache"
  ON public.tracking_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Adicionar tool check_tracking à tabela ai_tools se não existir
INSERT INTO public.ai_tools (name, description, function_schema, is_enabled, requires_auth) 
VALUES (
  'check_tracking',
  'Consulta o status de rastreio de um pedido pelo código de rastreio (tracking_code). Retorna informações da transportadora, status atual e datas.',
  '{
    "name": "check_tracking",
    "description": "Consulta status de rastreio de pedido pelo código de rastreamento ou email do cliente",
    "parameters": {
      "type": "object",
      "properties": {
        "tracking_code": {
          "type": "string",
          "description": "Código de rastreio do pedido (ex: AN405740645BR)"
        },
        "customer_email": {
          "type": "string",
          "description": "Email do cliente para buscar seus pedidos com rastreio"
        }
      },
      "required": []
    }
  }',
  true,
  false
)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  function_schema = EXCLUDED.function_schema,
  is_enabled = true;