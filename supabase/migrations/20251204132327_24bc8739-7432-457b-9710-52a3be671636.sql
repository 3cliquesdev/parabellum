-- Tornar profiles.department nullable (corrige erro NOT NULL ao criar perfis)
ALTER TABLE public.profiles ALTER COLUMN department DROP NOT NULL;

-- Tornar interactions.customer_id nullable (para interações internas sem cliente)
ALTER TABLE public.interactions ALTER COLUMN customer_id DROP NOT NULL;