-- FASE 1: Criar função de distribuição automática
CREATE OR REPLACE FUNCTION public.distribute_pending_deals_on_online()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_sales_rep BOOLEAN;
  v_pending_deals_count INTEGER;
  v_deals_to_assign INTEGER := 3; -- Máximo de deals por vez
BEGIN
  -- Só executar quando status muda para 'online'
  IF NEW.availability_status = 'online' 
     AND (OLD.availability_status IS NULL OR OLD.availability_status != 'online') THEN
    
    -- Verificar se é sales_rep
    SELECT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = NEW.id AND role = 'sales_rep'
    ) INTO v_is_sales_rep;
    
    IF v_is_sales_rep THEN
      -- Contar deals pendentes sem atribuição
      SELECT COUNT(*) INTO v_pending_deals_count
      FROM deals
      WHERE assigned_to IS NULL
        AND status = 'open';
      
      IF v_pending_deals_count > 0 THEN
        -- Distribuir até 3 deals para este vendedor (balanceando carga)
        UPDATE deals
        SET assigned_to = NEW.id
        WHERE id IN (
          SELECT id FROM deals
          WHERE assigned_to IS NULL
            AND status = 'open'
          ORDER BY created_at ASC -- Mais antigos primeiro
          LIMIT v_deals_to_assign
        );
        
        RAISE NOTICE 'Vendedor % ficou online - % deals distribuídos', 
          NEW.full_name, LEAST(v_pending_deals_count, v_deals_to_assign);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- FASE 2: Criar trigger para disparar a função
DROP TRIGGER IF EXISTS trigger_distribute_on_online ON profiles;

CREATE TRIGGER trigger_distribute_on_online
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (NEW.availability_status = 'online' AND OLD.availability_status IS DISTINCT FROM 'online')
EXECUTE FUNCTION distribute_pending_deals_on_online();

-- FASE 3: Corrigir valores errados e duplicados existentes

-- 1. Corrigir valores em centavos (dividir por 100)
UPDATE deals 
SET value = value / 100 
WHERE value > 10000 AND title LIKE 'Recuperação%';

-- 2. Deletar deals duplicados (manter mais antigo por contato+título)
DELETE FROM deals 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY contact_id, title 
      ORDER BY created_at ASC
    ) as rn
    FROM deals 
    WHERE status = 'open' AND title LIKE 'Recuperação%'
  ) sub WHERE rn > 1
);