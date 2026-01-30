-- Trigger para prevenir conversas órfãs em copilot
-- Se uma conversa em copilot perder o agente, volta automaticamente para waiting_human

CREATE OR REPLACE FUNCTION fix_orphan_copilot_conversations()
RETURNS TRIGGER AS $$
BEGIN
  -- Se estava em copilot e perdeu o agente, voltar para waiting_human
  IF OLD.ai_mode = 'copilot' 
     AND OLD.assigned_to IS NOT NULL 
     AND NEW.assigned_to IS NULL 
     AND NEW.status = 'open' THEN
    NEW.ai_mode := 'waiting_human';
    NEW.dispatch_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (drop se existir para evitar duplicação)
DROP TRIGGER IF EXISTS trigger_fix_orphan_copilot ON conversations;

CREATE TRIGGER trigger_fix_orphan_copilot
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION fix_orphan_copilot_conversations();