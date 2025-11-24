-- ============================================
-- FASE 5: TRIGGERS PARA AUTOMAÇÃO FINANCEIRA
-- Recriar triggers (drop + create)
-- ============================================

-- 1. Trigger: Calcular LTV automaticamente quando deal é ganho/atualizado
DROP TRIGGER IF EXISTS trigger_calculate_ltv ON public.deals;
CREATE TRIGGER trigger_calculate_ltv
  AFTER INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_customer_ltv();

-- 2. Trigger: Registrar interações automáticas (deal_created, deal_won, deal_lost)
DROP TRIGGER IF EXISTS trigger_auto_register_interaction ON public.deals;
CREATE TRIGGER trigger_auto_register_interaction
  AFTER INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_register_interaction();

-- 3. Trigger: Atualizar last_contact_date quando interação é criada
DROP TRIGGER IF EXISTS trigger_update_last_contact ON public.interactions;
CREATE TRIGGER trigger_update_last_contact
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_contact_date();

-- 4. Trigger: Registrar closed_at quando deal vira won/lost
DROP TRIGGER IF EXISTS trigger_update_deal_closed_at ON public.deals;
CREATE TRIGGER trigger_update_deal_closed_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deal_closed_at();

-- ============================================
-- CORREÇÃO DE DADOS HISTÓRICOS (executar uma vez)
-- ============================================

-- Recalcular LTV de todos os contatos com deals ganhos existentes
UPDATE public.contacts
SET total_ltv = COALESCE(
  (SELECT SUM(value) 
   FROM public.deals 
   WHERE contact_id = contacts.id 
     AND status = 'won'),
  0
)
WHERE id IN (
  SELECT DISTINCT contact_id 
  FROM public.deals 
  WHERE status = 'won' AND contact_id IS NOT NULL
);