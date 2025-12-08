-- Expand role permissions system with ~60 granular permissions
-- Insert new permissions for all roles using explicit INSERT statements

-- Inbox permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'inbox.access', 'Acessar Inbox', 'inbox',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep', 'support_agent', 'support_manager', 'consultant')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'inbox.transfer', 'Transferir conversas', 'inbox',
  r IN ('admin', 'general_manager', 'manager', 'support_agent', 'support_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'inbox.close', 'Fechar conversas', 'inbox',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep', 'support_agent', 'support_manager', 'consultant')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'inbox.create_ticket', 'Criar tickets da inbox', 'inbox',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep', 'support_agent', 'support_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Contacts permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'contacts.view', 'Visualizar contatos', 'contacts',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'contacts.edit', 'Editar contatos', 'contacts',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'contacts.delete', 'Excluir contatos', 'contacts',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'contacts.import', 'Importar clientes', 'contacts',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'contacts.export', 'Exportar contatos', 'contacts',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Tickets permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'tickets.view', 'Visualizar tickets', 'tickets',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep', 'support_agent', 'support_manager', 'financial_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'tickets.create', 'Criar tickets', 'tickets',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep', 'support_agent', 'support_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'tickets.resolve', 'Resolver tickets', 'tickets',
  r IN ('admin', 'general_manager', 'manager', 'support_agent', 'support_manager', 'financial_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'tickets.assign', 'Atribuir tickets', 'tickets',
  r IN ('admin', 'general_manager', 'manager', 'support_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'tickets.delete', 'Excluir tickets', 'tickets',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Quotes permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'quotes.view', 'Visualizar orçamentos', 'quotes',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'quotes.create', 'Criar orçamentos', 'quotes',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'quotes.edit', 'Editar orçamentos', 'quotes',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'quotes.approve', 'Aprovar orçamentos', 'quotes',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'quotes.send', 'Enviar orçamentos', 'quotes',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Forms permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'forms.view', 'Visualizar formulários', 'forms',
  r IN ('admin', 'general_manager', 'manager', 'sales_rep')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'forms.create', 'Criar formulários', 'forms',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'forms.edit', 'Editar formulários', 'forms',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'forms.delete', 'Excluir formulários', 'forms',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Email permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'email.view_templates', 'Ver templates de email', 'email',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'email.manage_templates', 'Gerenciar templates', 'email',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'email.manage_branding', 'Configurar branding de email', 'email',
  r IN ('admin', 'general_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'email.send_bulk', 'Enviar emails em massa', 'email',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Automations permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'automations.view', 'Ver automações', 'automations',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'automations.create', 'Criar automações', 'automations',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'automations.edit', 'Editar automações', 'automations',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'automations.delete', 'Excluir automações', 'automations',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Playbooks permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'playbooks.view', 'Ver playbooks', 'playbooks',
  r IN ('admin', 'general_manager', 'manager', 'consultant', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'playbooks.create', 'Criar playbooks', 'playbooks',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'playbooks.edit', 'Editar playbooks', 'playbooks',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'playbooks.execute', 'Executar playbooks manualmente', 'playbooks',
  r IN ('admin', 'general_manager', 'manager', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'playbooks.view_executions', 'Ver execuções de playbooks', 'playbooks',
  r IN ('admin', 'general_manager', 'manager', 'consultant', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'playbooks.change_consultant', 'Alterar consultor atribuído', 'playbooks',
  r IN ('admin', 'general_manager', 'manager', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- AI permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'ai.access_sandbox', 'Acessar sandbox de IA', 'ai',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'ai.manage_personas', 'Gerenciar personas de IA', 'ai',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'ai.train', 'Treinar exemplos de IA', 'ai',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'ai.configure_models', 'Configurar modelos de IA', 'ai',
  r IN ('admin', 'general_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- CS Management permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'cs.view_management', 'Ver dashboard CS', 'cs',
  r IN ('admin', 'general_manager', 'manager', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'cs.set_goals', 'Definir metas CS', 'cs',
  r IN ('admin', 'general_manager', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'cs.transfer_clients', 'Transferir clientes entre consultores', 'cs',
  r IN ('admin', 'general_manager', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'cs.view_all_consultants', 'Ver todos os consultores', 'cs',
  r IN ('admin', 'general_manager', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Sales Management permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'sales.view_management', 'Ver dashboard vendas', 'sales',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'sales.view_all_reps', 'Ver todos os vendedores', 'sales',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'sales.assign_leads', 'Atribuir leads a vendedores', 'sales',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Analytics permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'analytics.view', 'Ver analytics', 'analytics',
  r IN ('admin', 'general_manager', 'manager', 'cs_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'analytics.export', 'Exportar dados de analytics', 'analytics',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'analytics.financial', 'Ver analytics financeiro', 'analytics',
  r IN ('admin', 'general_manager', 'financial_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Settings permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'settings.integrations', 'Configurar integrações', 'settings',
  r IN ('admin', 'general_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'settings.whatsapp', 'Configurar WhatsApp', 'settings',
  r IN ('admin', 'general_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'settings.webhooks', 'Configurar webhooks', 'settings',
  r IN ('admin', 'general_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'settings.teams', 'Gerenciar times', 'settings',
  r IN ('admin', 'general_manager', 'manager', 'support_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'settings.tags', 'Gerenciar tags', 'settings',
  r IN ('admin', 'general_manager', 'manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'settings.departments', 'Gerenciar departamentos', 'settings',
  r IN ('admin', 'general_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'settings.recovery', 'Recuperar vendas históricas', 'settings',
  r IN ('admin', 'general_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'settings.support_channels', 'Gerenciar canais de suporte', 'settings',
  r IN ('admin', 'general_manager', 'support_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;

-- Audit permissions
INSERT INTO public.role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT r::app_role, 'audit.view_logs', 'Ver logs de auditoria', 'audit',
  r IN ('admin', 'general_manager')
FROM unnest(ARRAY['admin', 'general_manager', 'manager', 'sales_rep', 'consultant', 'support_agent', 'support_manager', 'financial_manager', 'cs_manager']) AS r
ON CONFLICT (role, permission_key) DO NOTHING;