-- Trigger para redistribuir conversas quando agente fica offline
CREATE OR REPLACE FUNCTION redistribute_on_agent_offline()
RETURNS TRIGGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Se agente mudou de online para offline/busy
  IF OLD.availability_status = 'online' AND NEW.availability_status != 'online' THEN
    -- Atualizar conversas abertas desse agente para fila (devolver para IA)
    UPDATE conversations
    SET 
      assigned_to = NULL,
      previous_agent_id = OLD.id,
      ai_mode = 'autopilot'
    WHERE 
      assigned_to = OLD.id 
      AND status = 'open';
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    IF affected_count > 0 THEN
      RAISE NOTICE 'Redistributed % conversations from agent % going offline', affected_count, OLD.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remover trigger se existir
DROP TRIGGER IF EXISTS on_agent_status_change ON profiles;

-- Criar trigger
CREATE TRIGGER on_agent_status_change
AFTER UPDATE OF availability_status ON profiles
FOR EACH ROW
EXECUTE FUNCTION redistribute_on_agent_offline();