-- =============================================
-- FIX: Adicionar coluna instance_id na rate_limits
-- e colunas de contadores que estão faltando
-- =============================================

-- Adicionar coluna instance_id se não existir
ALTER TABLE public.rate_limits 
ADD COLUMN IF NOT EXISTS instance_id UUID,
ADD COLUMN IF NOT EXISTS minute_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hour_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS day_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_minute_reset TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_hour_reset TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_day_reset TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Criar índice único para instance_id (para ON CONFLICT funcionar)
CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_instance_id_idx ON public.rate_limits (instance_id) WHERE instance_id IS NOT NULL;

-- Recriar as funções com tratamento de erro melhorado
CREATE OR REPLACE FUNCTION public.update_rate_limit_counters(p_instance_id UUID)
RETURNS TABLE(can_send BOOLEAN, wait_ms INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limit RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_can_send BOOLEAN := true;
  v_wait_ms INTEGER := 0;
BEGIN
  -- Se instance_id for null, permitir envio
  IF p_instance_id IS NULL THEN
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  -- Obter ou criar rate limit para a instância
  INSERT INTO rate_limits (instance_id, identifier, action_type)
  VALUES (p_instance_id, p_instance_id::text, 'whatsapp_message')
  ON CONFLICT (instance_id) WHERE instance_id IS NOT NULL DO NOTHING;
  
  SELECT * INTO v_rate_limit FROM rate_limits WHERE instance_id = p_instance_id FOR UPDATE;
  
  -- Se não encontrou, permitir envio
  IF v_rate_limit IS NULL THEN
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;
  
  -- Reset contadores se necessário
  IF v_rate_limit.last_minute_reset IS NULL OR v_rate_limit.last_minute_reset < v_now - INTERVAL '1 minute' THEN
    UPDATE rate_limits SET minute_count = 0, last_minute_reset = v_now WHERE instance_id = p_instance_id;
    v_rate_limit.minute_count := 0;
  END IF;
  
  IF v_rate_limit.last_hour_reset IS NULL OR v_rate_limit.last_hour_reset < v_now - INTERVAL '1 hour' THEN
    UPDATE rate_limits SET hour_count = 0, last_hour_reset = v_now WHERE instance_id = p_instance_id;
    v_rate_limit.hour_count := 0;
  END IF;
  
  IF v_rate_limit.last_day_reset IS NULL OR v_rate_limit.last_day_reset < v_now - INTERVAL '1 day' THEN
    UPDATE rate_limits SET day_count = 0, last_day_reset = v_now WHERE instance_id = p_instance_id;
    v_rate_limit.day_count := 0;
  END IF;
  
  -- Verificar se está bloqueado
  IF v_rate_limit.is_blocked = true AND v_rate_limit.blocked_until > v_now THEN
    v_can_send := false;
    v_wait_ms := EXTRACT(EPOCH FROM (v_rate_limit.blocked_until - v_now))::INTEGER * 1000;
  -- Verificar limites
  ELSIF COALESCE(v_rate_limit.minute_count, 0) >= COALESCE(v_rate_limit.max_per_minute, 8) THEN
    v_can_send := false;
    v_wait_ms := EXTRACT(EPOCH FROM (COALESCE(v_rate_limit.last_minute_reset, v_now) + INTERVAL '1 minute' - v_now))::INTEGER * 1000;
  ELSIF COALESCE(v_rate_limit.hour_count, 0) >= COALESCE(v_rate_limit.max_per_hour, 200) THEN
    v_can_send := false;
    v_wait_ms := EXTRACT(EPOCH FROM (COALESCE(v_rate_limit.last_hour_reset, v_now) + INTERVAL '1 hour' - v_now))::INTEGER * 1000;
  ELSIF COALESCE(v_rate_limit.day_count, 0) >= COALESCE(v_rate_limit.max_per_day, 1000) THEN
    v_can_send := false;
    v_wait_ms := EXTRACT(EPOCH FROM (COALESCE(v_rate_limit.last_day_reset, v_now) + INTERVAL '1 day' - v_now))::INTEGER * 1000;
  END IF;
  
  RETURN QUERY SELECT v_can_send, GREATEST(v_wait_ms, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_rate_limit_counters(p_instance_id UUID)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se instance_id for null, não fazer nada
  IF p_instance_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE rate_limits 
  SET 
    minute_count = COALESCE(minute_count, 0) + 1,
    hour_count = COALESCE(hour_count, 0) + 1,
    day_count = COALESCE(day_count, 0) + 1,
    updated_at = NOW()
  WHERE instance_id = p_instance_id;
END;
$$;