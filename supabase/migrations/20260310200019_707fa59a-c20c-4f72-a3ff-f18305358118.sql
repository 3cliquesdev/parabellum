
CREATE OR REPLACE FUNCTION public.auto_assign_on_send(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_assigned_to uuid;
  v_current_ai_mode text;
  v_caller_id uuid := auth.uid();
BEGIN
  -- Get current conversation state
  SELECT assigned_to, ai_mode
  INTO v_current_assigned_to, v_current_ai_mode
  FROM conversations
  WHERE id = p_conversation_id;

  -- Only auto-assign if conversation has no assigned agent
  -- and ai_mode is waiting_human or autopilot
  IF v_current_assigned_to IS NULL 
     AND v_current_ai_mode IN ('waiting_human', 'autopilot') THEN
    
    -- Update conversation: assign to caller, set copilot mode
    UPDATE conversations
    SET assigned_to = v_caller_id,
        ai_mode = 'copilot',
        updated_at = now()
    WHERE id = p_conversation_id;

    -- Cancel any active chat flow states
    UPDATE chat_flow_states
    SET status = 'cancelled',
        completed_at = now()
    WHERE conversation_id = p_conversation_id
      AND status IN ('in_progress', 'active', 'waiting_input');

    RETURN jsonb_build_object(
      'assigned', true,
      'assigned_to', v_caller_id,
      'previous_ai_mode', v_current_ai_mode
    );
  END IF;

  -- No action needed
  RETURN jsonb_build_object('assigned', false, 'reason', 'already_assigned_or_disabled');
END;
$$;
