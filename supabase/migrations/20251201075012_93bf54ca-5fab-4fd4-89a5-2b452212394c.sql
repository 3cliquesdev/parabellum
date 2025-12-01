-- FASE 6: Correção de Dados Existentes

-- 1. Corrigir valores incorretos (centavos para reais - Angela Bender caso)
UPDATE deals 
SET 
  value = CASE 
    WHEN value > 10000 THEN value / 100  -- Se > R$ 10.000, provavelmente está em centavos
    ELSE value
  END,
  gross_value = CASE 
    WHEN value > 10000 THEN value / 100
    ELSE value
  END,
  net_value = CASE 
    WHEN value > 10000 THEN (value / 100) * 0.7  -- Estimativa 70% do bruto
    ELSE value * 0.7
  END
WHERE 
  (title ILIKE '%Kiwify%' OR title ILIKE '%Recuperação%' OR title ILIKE '%Upsell%')
  AND gross_value IS NULL;

-- 2. Preencher gross_value onde está NULL para deals Kiwify antigos
UPDATE deals 
SET 
  gross_value = value,
  net_value = value * 0.7,  -- Estimativa conservadora 70% do valor é líquido
  kiwify_fee = value * 0.07, -- Estimativa taxa Kiwify ~7%
  affiliate_commission = value * 0.23 -- Estimativa comissão afiliado ~23%
WHERE 
  gross_value IS NULL 
  AND (title ILIKE '%Kiwify%' OR title ILIKE '%Recuperação%' OR title ILIKE '%Upsell%')
  AND value > 0;