-- FASE 11A: Adicionar campo de previsão de fechamento aos negócios
ALTER TABLE public.deals 
ADD COLUMN expected_close_date DATE;

COMMENT ON COLUMN public.deals.expected_close_date IS 'Data prevista para fechamento do negócio - usado para previsão de vendas e hot deals';