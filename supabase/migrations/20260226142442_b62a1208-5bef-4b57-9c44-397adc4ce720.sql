CREATE OR REPLACE FUNCTION public.sync_consultant_to_open_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  updated_conv RECORD;
BEGIN
  FOR updated_conv IN
    UPDATE conversations
    SET assigned_to = NEW.consultant_id,
        ai_mode = 'copilot'
    WHERE contact_id = NEW.id
      AND status = 'open'
      AND assigned_to IS NULL
    RETURNING id
  LOOP
    INSERT INTO interactions (
      customer_id,
      type,
      content,
      channel,
      metadata,
      created_at
    ) VALUES (
      NEW.id,
      'note',
      'Conversa atribuída automaticamente ao consultor do contato (sync_consultant_trigger)',
      'other',
      jsonb_build_object(
        'trigger', 'sync_consultant_to_open_conversations',
        'consultant_id', NEW.consultant_id,
        'contact_id', NEW.id,
        'conversation_id', updated_conv.id
      ),
      now()
    );
  END LOOP;

  RETURN NEW;
END;
$function$;