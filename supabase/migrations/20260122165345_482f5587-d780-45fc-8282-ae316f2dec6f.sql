-- Função para validar restauração apenas por admin
CREATE OR REPLACE FUNCTION public.validate_attachment_restoration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Se estamos adicionando attachments (potencial restauração)
  IF NEW.attachments IS NOT NULL 
     AND OLD.attachments IS NOT NULL
     AND jsonb_array_length(COALESCE(NEW.attachments, '[]'::jsonb)) > jsonb_array_length(COALESCE(OLD.attachments, '[]'::jsonb))
  THEN
    -- Verificar se algum attachment novo tem restored_at (indica restauração)
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.attachments) elem
      WHERE elem->>'restored_at' IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(OLD.attachments, '[]'::jsonb)) old_elem
          WHERE old_elem->>'url' = elem->>'url'
        )
    ) THEN
      -- Buscar role do usuário atual
      SELECT ur.role INTO user_role
      FROM user_roles ur
      WHERE ur.user_id = auth.uid();
      
      -- Apenas admin pode restaurar
      IF user_role IS NULL OR user_role != 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem restaurar evidências removidas.';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para validar restauração de attachments
DROP TRIGGER IF EXISTS validate_attachment_restoration_trigger ON tickets;
CREATE TRIGGER validate_attachment_restoration_trigger
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION validate_attachment_restoration();