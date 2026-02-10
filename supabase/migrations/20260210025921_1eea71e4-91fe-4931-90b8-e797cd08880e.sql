
-- 1. Nova coluna requesting_department_id
ALTER TABLE public.tickets ADD COLUMN requesting_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 2. Backfill: preencher tickets existentes com o department do criador
UPDATE public.tickets t
SET requesting_department_id = p.department
FROM public.profiles p
WHERE t.created_by = p.id
  AND p.department IS NOT NULL
  AND t.requesting_department_id IS NULL;

-- 3. Trigger para auto-preencher no INSERT
CREATE OR REPLACE FUNCTION public.set_requesting_department()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requesting_department_id IS NULL AND NEW.created_by IS NOT NULL THEN
    SELECT department INTO NEW.requesting_department_id
    FROM public.profiles WHERE id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_requesting_department
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_requesting_department();
