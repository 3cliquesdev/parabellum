-- Fase 7.1B: Limpar registros órfãos em user_roles
-- Remove user_roles que não têm profile correspondente

DELETE FROM public.user_roles
WHERE user_id NOT IN (
  SELECT id FROM public.profiles
);

-- Verificar integridade: listar user_roles sem profiles (deve retornar 0)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.user_roles ur
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id
  );
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Ainda existem % registros órfãos em user_roles', orphan_count;
  ELSE
    RAISE NOTICE 'Limpeza concluída: todos os user_roles têm profiles correspondentes';
  END IF;
END $$;