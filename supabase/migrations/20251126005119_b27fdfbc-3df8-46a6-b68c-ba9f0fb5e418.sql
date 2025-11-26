-- ========================================
-- FASE 2: AUDIT LOGS (Imutável)
-- ========================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('DELETE', 'UPDATE', 'EXPORT')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS: Imutável - apenas INSERT e SELECT
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode inserir logs
CREATE POLICY "authenticated_can_insert_audit_logs" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (true);

-- Apenas admin pode visualizar
CREATE POLICY "admin_can_view_audit_logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- NENHUMA POLICY DE UPDATE OU DELETE = IMUTÁVEL

-- ========================================
-- TRIGGERS DE AUDITORIA
-- ========================================

-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para tabelas críticas
CREATE TRIGGER audit_contacts_trigger
AFTER UPDATE OR DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_deals_trigger
AFTER UPDATE OR DELETE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_tickets_trigger
AFTER UPDATE OR DELETE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- ========================================
-- FASE 3: EMAIL VERIFICATIONS (OTP)
-- ========================================

CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Limitar tentativas
  CONSTRAINT max_attempts CHECK (attempts <= 3)
);

-- Índices para lookup e limpeza
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON public.email_verifications(expires_at);

-- RLS: Público pode inserir e verificar
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_can_insert_verifications" ON public.email_verifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "public_can_update_own_verifications" ON public.email_verifications
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "public_can_select_own_verifications" ON public.email_verifications
FOR SELECT USING (true);

-- ========================================
-- FASE 4: RATE LIMITING
-- ========================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 1,
  blocked_until TIMESTAMPTZ,
  
  UNIQUE(identifier, action_type)
);

-- Índice para cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON public.rate_limits(blocked_until);

-- RLS: Sistema pode gerenciar
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_can_manage_rate_limits" ON public.rate_limits
FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- FUNÇÃO DE RATE LIMITING
-- ========================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1,
  p_block_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Buscar ou criar registro
  SELECT * INTO v_record FROM public.rate_limits 
  WHERE identifier = p_identifier AND action_type = p_action_type
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Primeiro request, criar registro
    INSERT INTO public.rate_limits (identifier, action_type, request_count, window_start)
    VALUES (p_identifier, p_action_type, 1, v_now);
    RETURN TRUE;
  END IF;
  
  -- Se está bloqueado, verificar se já passou o tempo
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    RETURN FALSE; -- Ainda bloqueado
  END IF;
  
  -- Se janela expirou, resetar contador
  IF v_record.window_start < v_now - (p_window_minutes || ' minutes')::interval THEN
    UPDATE public.rate_limits SET 
      request_count = 1, 
      window_start = v_now,
      blocked_until = NULL
    WHERE identifier = p_identifier AND action_type = p_action_type;
    RETURN TRUE;
  END IF;
  
  -- Incrementar contador
  IF v_record.request_count >= p_max_requests THEN
    -- Bloquear por p_block_minutes
    UPDATE public.rate_limits SET 
      blocked_until = v_now + (p_block_minutes || ' minutes')::interval
    WHERE identifier = p_identifier AND action_type = p_action_type;
    RETURN FALSE; -- Bloqueado agora
  END IF;
  
  -- Permitir e incrementar
  UPDATE public.rate_limits SET 
    request_count = request_count + 1
  WHERE identifier = p_identifier AND action_type = p_action_type;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;