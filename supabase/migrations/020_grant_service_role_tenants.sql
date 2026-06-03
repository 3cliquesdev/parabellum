-- Garantir que rotas server-side com service_role possam atualizar tenants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO service_role;
