-- Limpar consultant_id de contatos vinculados a não-consultores
UPDATE public.contacts 
SET consultant_id = NULL 
WHERE consultant_id IN (
  'c190047a-9005-45e3-81d1-0814ca6727b0', -- Fernanda (sales_rep)
  '522d898d-347b-495e-b4e6-23759c21b07f', -- Loriani (sales_rep)
  '6e8c3566-8489-4ba4-9f8d-52aa42af430b', -- Thaynara (sales_rep)
  'dfc475f0-014b-45e4-9fdf-4ad879ffdc9a', -- Bruno (sales_rep)
  'de03d434-9e8c-466b-b7a8-9a08bbef1760', -- Camila (sales_rep)
  '697a5d4e-9637-4b85-b7a0-bd880151648b'  -- Ronildo Oliveira (admin)
);