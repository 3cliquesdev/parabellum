-- Fase 1: Popular contacts.assigned_to baseado nos deals existentes
UPDATE contacts c
SET assigned_to = d.assigned_to
FROM deals d
WHERE c.id = d.contact_id
  AND c.assigned_to IS NULL
  AND d.assigned_to IS NOT NULL;

-- Fase 2: Criar função para sincronizar automaticamente
CREATE OR REPLACE FUNCTION sync_contact_assigned_from_deal()
RETURNS TRIGGER AS $$
BEGIN
  -- Se deal tem assigned_to e contact_id, sincronizar o contact
  IF NEW.assigned_to IS NOT NULL AND NEW.contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET assigned_to = NEW.assigned_to
    WHERE id = NEW.contact_id
      AND (assigned_to IS NULL OR assigned_to != NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fase 3: Criar trigger para manter sincronizado em novos deals
DROP TRIGGER IF EXISTS sync_contact_on_deal_change ON deals;

CREATE TRIGGER sync_contact_on_deal_change
AFTER INSERT OR UPDATE OF assigned_to, contact_id ON deals
FOR EACH ROW
EXECUTE FUNCTION sync_contact_assigned_from_deal();