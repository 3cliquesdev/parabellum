-- Função que atribui papel automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.assign_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se não existe nenhum registro em user_roles, é o primeiro usuário (admin)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role);
  ELSE
    -- Usuários subsequentes recebem papel 'user'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger que executa a função após criar usuário
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_first_admin();