-- Função que reabre tickets fechados/resolvidos quando recebem novo comentário
CREATE OR REPLACE FUNCTION public.reopen_closed_ticket_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_status TEXT;
  v_ticket_created_by UUID;
  v_commenter_name TEXT;
BEGIN
  -- Buscar status atual do ticket
  SELECT status, created_by INTO v_ticket_status, v_ticket_created_by
  FROM public.tickets 
  WHERE id = NEW.ticket_id;
  
  -- Se o ticket está fechado ou resolvido e recebeu novo comentário (não interno)
  IF v_ticket_status IN ('closed', 'resolved') AND NEW.is_internal = false THEN
    -- Reabrir o ticket com status 'open'
    UPDATE public.tickets
    SET 
      status = 'open',
      updated_at = NOW()
    WHERE id = NEW.ticket_id;
    
    -- Buscar nome do autor do comentário para notificação
    SELECT full_name INTO v_commenter_name
    FROM public.profiles
    WHERE id = NEW.created_by;
    
    -- Inserir notificação para o criador original do ticket
    IF v_ticket_created_by IS NOT NULL AND v_ticket_created_by != NEW.created_by THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link,
        metadata
      ) VALUES (
        v_ticket_created_by,
        'ticket_reopened',
        'Ticket Reaberto',
        'Seu ticket foi reaberto após novo comentário de ' || COALESCE(v_commenter_name, 'um agente'),
        '/support/' || NEW.ticket_id,
        jsonb_build_object(
          'ticket_id', NEW.ticket_id,
          'comment_id', NEW.id,
          'reopened_by', NEW.created_by
        )
      );
    END IF;
    
    -- Registrar evento de reabertura
    INSERT INTO public.ticket_events (
      ticket_id,
      event_type,
      actor_id,
      old_value,
      new_value,
      metadata
    ) VALUES (
      NEW.ticket_id,
      'reopened',
      NEW.created_by,
      v_ticket_status,
      'open',
      jsonb_build_object(
        'reason', 'new_comment',
        'comment_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar o trigger (drop se existir para evitar duplicação)
DROP TRIGGER IF EXISTS trigger_reopen_ticket_on_comment ON public.ticket_comments;

CREATE TRIGGER trigger_reopen_ticket_on_comment
  AFTER INSERT ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.reopen_closed_ticket_on_comment();