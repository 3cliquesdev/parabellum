-- Corrigir search_path da função para segurança
CREATE OR REPLACE FUNCTION sync_contact_assigned_from_deal()
RETURNS TRIGGER AS $$
BEGIN
  -- Se deal tem assigned_to e contact_id, sincronizar o contact
  IF NEW.assigned_to IS NOT NULL AND NEW.contact_id IS NOT NULL THEN
    UPDATE public.contacts 
    SET assigned_to = NEW.assigned_to
    WHERE id = NEW.contact_id
      AND (assigned_to IS NULL OR assigned_to != NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;