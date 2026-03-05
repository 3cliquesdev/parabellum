
-- A) Remover trigger/função redundante e reusar a padrão
DROP TRIGGER IF EXISTS trg_sales_channels_updated_at ON public.sales_channels;
DROP FUNCTION IF EXISTS public.update_sales_channels_updated_at();

CREATE TRIGGER update_sales_channels_updated_at
  BEFORE UPDATE ON public.sales_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- B) Trigger de validação: deals.external_order_id obrigatório quando canal exige
CREATE OR REPLACE FUNCTION public.validate_deal_sales_channel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sales_channel_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.sales_channels
      WHERE id = NEW.sales_channel_id AND requires_order_id = true
    ) AND (NEW.external_order_id IS NULL OR trim(NEW.external_order_id) = '') THEN
      RAISE EXCEPTION 'O canal de venda selecionado exige um ID de venda (external_order_id)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_deal_sales_channel
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_deal_sales_channel();
