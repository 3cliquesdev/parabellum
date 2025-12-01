-- Corrigir valores de deals que não foram convertidos corretamente (centavos → reais)
-- Deals com valores > 100 que são claramente centavos não convertidos
UPDATE deals 
SET value = value / 100 
WHERE title LIKE 'Recuperação%' 
  AND value > 100 
  AND value NOT IN (197, 297, 397, 497, 597, 697, 797, 897, 997);

-- Atualizar CNPJ do cliente IBUYBRASIL
UPDATE contacts 
SET document = '59597430000185'
WHERE email = 'kaiohaedner2015@gmail.com' 
  AND document IS NULL;

-- Corrigir especificamente o deal do Uni3Cliques
UPDATE deals 
SET value = 29.00 
WHERE id = '50122bbc-c630-497e-8b9e-ab38bbecbde2';