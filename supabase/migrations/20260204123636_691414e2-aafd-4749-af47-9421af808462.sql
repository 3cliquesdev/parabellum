-- =============================================
-- PATCH DEFINITIVO: Permissões de Transferência
-- =============================================

-- 1. Habilitar users.manage para cs_manager
UPDATE role_permissions
SET enabled = true, updated_at = now()
WHERE role = 'cs_manager' AND permission_key = 'users.manage';

-- 2. Criar RPC transfer_ticket_secure (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.transfer_ticket_secure(
  p_ticket_id UUID,
  p_department_id UUID,
  p_assigned_to UUID DEFAULT NULL,
  p_internal_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_ticket RECORD;
  v_is_authorized BOOLEAN := false;
  v_dept_name TEXT;
  v_assignee_name TEXT;
BEGIN
  -- 1. Buscar ticket
  SELECT id, assigned_to, created_by, department_id
  INTO v_ticket
  FROM tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket não encontrado');
  END IF;

  -- 2. Verificar autorização:
  -- - admin/manager/general_manager/cs_manager/support_manager/financial_manager: pode tudo
  -- - support_agent/financial_agent: só se ticket atribuído a ele, criado por ele, ou unassigned
  IF has_role(v_caller_id, 'admin'::app_role) 
     OR has_role(v_caller_id, 'manager'::app_role)
     OR has_role(v_caller_id, 'general_manager'::app_role)
     OR has_role(v_caller_id, 'cs_manager'::app_role)
     OR has_role(v_caller_id, 'support_manager'::app_role)
     OR has_role(v_caller_id, 'financial_manager'::app_role)
  THEN
    v_is_authorized := true;
  ELSIF has_role(v_caller_id, 'support_agent'::app_role) 
        OR has_role(v_caller_id, 'financial_agent'::app_role)
        OR has_role(v_caller_id, 'ecommerce_analyst'::app_role)
        OR has_role(v_caller_id, 'sales_rep'::app_role)
  THEN
    v_is_authorized := (
      v_ticket.assigned_to = v_caller_id 
      OR v_ticket.created_by = v_caller_id 
      OR v_ticket.assigned_to IS NULL
    );
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para transferir este ticket');
  END IF;

  -- 3. Buscar nome do departamento
  SELECT name INTO v_dept_name FROM departments WHERE id = p_department_id;

  -- 4. Buscar nome do assignee se fornecido
  IF p_assigned_to IS NOT NULL THEN
    SELECT full_name INTO v_assignee_name FROM profiles WHERE id = p_assigned_to;
  END IF;

  -- 5. Executar transferência
  UPDATE tickets
  SET 
    department_id = p_department_id,
    assigned_to = p_assigned_to,
    status = CASE 
      WHEN p_assigned_to IS NOT NULL THEN 'in_progress'
      ELSE 'open'
    END,
    updated_at = now()
  WHERE id = p_ticket_id;

  -- 6. Criar comentário interno com nota de transferência
  IF p_internal_note IS NOT NULL AND p_internal_note != '' THEN
    INSERT INTO ticket_comments (ticket_id, content, is_internal, created_by)
    VALUES (
      p_ticket_id, 
      format('📤 Ticket transferido para %s%s\n\n%s', 
        COALESCE(v_dept_name, 'Departamento'), 
        CASE WHEN v_assignee_name IS NOT NULL THEN format(' (atribuído para %s)', v_assignee_name) ELSE '' END,
        p_internal_note
      ), 
      true, 
      v_caller_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'department_id', p_department_id,
    'department_name', v_dept_name,
    'assigned_to', p_assigned_to,
    'assignee_name', v_assignee_name
  );
END;
$$;

-- Revogar acesso público e conceder apenas para authenticated
REVOKE ALL ON FUNCTION public.transfer_ticket_secure(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_ticket_secure(UUID, UUID, UUID, TEXT) TO authenticated;

-- 3. Criar RPC take_control_secure (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.take_control_secure(
  p_conversation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_conversation RECORD;
  v_profile RECORD;
  v_is_authorized BOOLEAN := false;
BEGIN
  -- 1. Buscar conversa
  SELECT c.*, d.name as dept_name
  INTO v_conversation
  FROM conversations c
  LEFT JOIN departments d ON d.id = c.department
  WHERE c.id = p_conversation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conversa não encontrada');
  END IF;

  -- 2. Buscar perfil do usuário
  SELECT id, full_name, availability_status
  INTO v_profile
  FROM profiles
  WHERE id = v_caller_id;

  -- 3. Verificar se é manager/admin (não precisa estar online)
  IF has_role(v_caller_id, 'admin'::app_role) 
     OR has_role(v_caller_id, 'manager'::app_role)
     OR has_role(v_caller_id, 'general_manager'::app_role)
     OR has_role(v_caller_id, 'cs_manager'::app_role)
     OR has_role(v_caller_id, 'support_manager'::app_role)
     OR has_role(v_caller_id, 'financial_manager'::app_role)
  THEN
    v_is_authorized := true;
  ELSE
    -- Agentes precisam estar online
    IF v_profile.availability_status != 'online' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Altere seu status para Online para assumir conversas');
    END IF;
    
    -- Conversa não atribuída (IA) pode ser assumida por qualquer agente
    IF v_conversation.assigned_to IS NULL THEN
      v_is_authorized := true;
    -- Conversa atribuída ao próprio usuário
    ELSIF v_conversation.assigned_to = v_caller_id THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para assumir esta conversa');
  END IF;

  -- 4. Executar takeover
  UPDATE conversations
  SET 
    ai_mode = 'copilot',
    assigned_to = v_caller_id,
    updated_at = now()
  WHERE id = p_conversation_id;

  -- 5. Inserir mensagem de sistema
  INSERT INTO messages (conversation_id, content, sender_type, sender_id, is_ai_generated)
  VALUES (
    p_conversation_id,
    format('O atendente **%s** entrou na conversa.', COALESCE(v_profile.full_name, 'Suporte')),
    'system',
    v_caller_id,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'assigned_to', v_caller_id,
    'ai_mode', 'copilot'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.take_control_secure(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.take_control_secure(UUID) TO authenticated;