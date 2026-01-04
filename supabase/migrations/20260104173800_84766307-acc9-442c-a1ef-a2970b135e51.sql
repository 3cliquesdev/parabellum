-- Add title column for public display
ALTER TABLE public.forms 
ADD COLUMN title text;

COMMENT ON COLUMN public.forms.title IS 'Título público do formulário exibido para usuários';