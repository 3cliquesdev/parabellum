-- FIX de seguranca: a view admin_tenant_overview foi criada em 018 sem
-- security_invoker, entao rodava com as permissoes do OWNER e BYPASSAVA o RLS
-- das tabelas base (tenants, agencies, plans, subscriptions, tenant_billing, leads).
-- Qualquer usuario logado conseguia ler nome/plano/MRR/leads de TODOS os tenants
-- via PostgREST (supabase.from('admin_tenant_overview').select('*')).
--
-- Com security_invoker = true a view passa a executar com as permissoes de quem
-- consulta, entao o RLS das tabelas base volta a valer: um usuario comum so ve o
-- proprio tenant. O painel super admin (rota /api/admin/data) usa a service_role,
-- que ignora RLS por design e continua enxergando tudo — o gate de super_admin
-- ja e feito na rota.

ALTER VIEW admin_tenant_overview SET (security_invoker = true);
