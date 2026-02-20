
-- Analytics / Report Builder - 10 tabelas + RLS + indexes + seeds

create extension if not exists "pgcrypto";

-- 1) data_catalog
create table if not exists public.data_catalog (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  field_name text not null,
  field_type text not null check (field_type in ('text','number','date','boolean','uuid','jsonb')),
  label text,
  description text,
  is_sensitive boolean not null default false,
  allow_filter boolean not null default true,
  allow_group boolean not null default true,
  allow_aggregate boolean not null default false,
  allowed_roles text[] null,
  category text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (entity, field_name)
);
create index if not exists idx_data_catalog_entity on public.data_catalog(entity);
create index if not exists idx_data_catalog_entity_category on public.data_catalog(entity, category);
create index if not exists idx_data_catalog_sensitive on public.data_catalog(is_sensitive);
alter table public.data_catalog enable row level security;
drop policy if exists "data_catalog_select_authenticated" on public.data_catalog;
create policy "data_catalog_select_authenticated" on public.data_catalog for select to authenticated using (true);
drop policy if exists "data_catalog_write_admin_manager" on public.data_catalog;
create policy "data_catalog_write_admin_manager" on public.data_catalog for all to authenticated using (public.is_manager_or_admin(auth.uid())) with check (public.is_manager_or_admin(auth.uid()));

-- 2) semantic_metrics
create table if not exists public.semantic_metrics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text,
  description text,
  entity_base text not null,
  expression_type text not null check (expression_type in ('count','sum','avg','min','max','ratio','custom_sql')),
  expression text null,
  numerator_field text null,
  denominator_field text null,
  default_filters jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid null,
  created_at timestamptz not null default now()
);
create index if not exists idx_semantic_metrics_entity_base on public.semantic_metrics(entity_base);
create index if not exists idx_semantic_metrics_active on public.semantic_metrics(is_active);
alter table public.semantic_metrics enable row level security;
drop policy if exists "semantic_metrics_select_authenticated" on public.semantic_metrics;
create policy "semantic_metrics_select_authenticated" on public.semantic_metrics for select to authenticated using (true);
drop policy if exists "semantic_metrics_write_admin_manager" on public.semantic_metrics;
create policy "semantic_metrics_write_admin_manager" on public.semantic_metrics for all to authenticated using (public.is_manager_or_admin(auth.uid())) with check (public.is_manager_or_admin(auth.uid()));

-- 3) report_definitions
create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_entity text not null,
  joins jsonb not null default '[]'::jsonb,
  is_template boolean not null default false,
  is_public boolean not null default false,
  created_by uuid not null,
  updated_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists idx_report_definitions_created_by on public.report_definitions(created_by);
create index if not exists idx_report_definitions_public on public.report_definitions(is_public);
create index if not exists idx_report_definitions_entity on public.report_definitions(base_entity);
alter table public.report_definitions enable row level security;
drop policy if exists "report_definitions_select" on public.report_definitions;
create policy "report_definitions_select" on public.report_definitions for select to authenticated using (public.is_manager_or_admin(auth.uid()) OR is_public = true OR created_by = auth.uid());
drop policy if exists "report_definitions_insert" on public.report_definitions;
create policy "report_definitions_insert" on public.report_definitions for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "report_definitions_update" on public.report_definitions;
create policy "report_definitions_update" on public.report_definitions for update to authenticated using (public.is_manager_or_admin(auth.uid()) OR created_by = auth.uid()) with check (public.is_manager_or_admin(auth.uid()) OR created_by = auth.uid());
drop policy if exists "report_definitions_delete" on public.report_definitions;
create policy "report_definitions_delete" on public.report_definitions for delete to authenticated using (public.is_manager_or_admin(auth.uid()) OR created_by = auth.uid());

-- 4) report_fields
create table if not exists public.report_fields (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report_definitions(id) on delete cascade,
  entity text not null,
  field_name text not null,
  alias text null,
  sort_order int not null default 0
);
create index if not exists idx_report_fields_report_id on public.report_fields(report_id);
create index if not exists idx_report_fields_entity_field on public.report_fields(entity, field_name);
alter table public.report_fields enable row level security;
drop policy if exists "report_fields_select" on public.report_fields;
create policy "report_fields_select" on public.report_fields for select to authenticated using (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.is_public = true OR rd.created_by = auth.uid())));
drop policy if exists "report_fields_write" on public.report_fields;
create policy "report_fields_write" on public.report_fields for all to authenticated using (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.created_by = auth.uid()))) with check (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.created_by = auth.uid())));

-- 5) report_metrics
create table if not exists public.report_metrics (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report_definitions(id) on delete cascade,
  metric_name text null,
  aggregation_type text not null check (aggregation_type in ('count','sum','avg','min','max','count_distinct','percentage','ratio')),
  field_name text null,
  entity text not null,
  sort_order int not null default 0
);
create index if not exists idx_report_metrics_report_id on public.report_metrics(report_id);
alter table public.report_metrics enable row level security;
drop policy if exists "report_metrics_select" on public.report_metrics;
create policy "report_metrics_select" on public.report_metrics for select to authenticated using (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.is_public = true OR rd.created_by = auth.uid())));
drop policy if exists "report_metrics_write" on public.report_metrics;
create policy "report_metrics_write" on public.report_metrics for all to authenticated using (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.created_by = auth.uid()))) with check (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.created_by = auth.uid())));

-- 6) report_filters
create table if not exists public.report_filters (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report_definitions(id) on delete cascade,
  entity text not null,
  field_name text not null,
  operator text not null check (operator in ('eq','neq','gt','lt','gte','lte','contains','not_contains','between','in','is_null','is_not_null')),
  value jsonb null,
  is_required boolean not null default false
);
create index if not exists idx_report_filters_report_id on public.report_filters(report_id);
alter table public.report_filters enable row level security;
drop policy if exists "report_filters_select" on public.report_filters;
create policy "report_filters_select" on public.report_filters for select to authenticated using (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.is_public = true OR rd.created_by = auth.uid())));
drop policy if exists "report_filters_write" on public.report_filters;
create policy "report_filters_write" on public.report_filters for all to authenticated using (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.created_by = auth.uid()))) with check (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.created_by = auth.uid())));

-- 7) report_groupings
create table if not exists public.report_groupings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report_definitions(id) on delete cascade,
  entity text not null,
  field_name text not null,
  time_grain text null check (time_grain in ('day','week','month','quarter','year')),
  sort_order int not null default 0
);
create index if not exists idx_report_groupings_report_id on public.report_groupings(report_id);
alter table public.report_groupings enable row level security;
drop policy if exists "report_groupings_select" on public.report_groupings;
create policy "report_groupings_select" on public.report_groupings for select to authenticated using (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.is_public = true OR rd.created_by = auth.uid())));
drop policy if exists "report_groupings_write" on public.report_groupings;
create policy "report_groupings_write" on public.report_groupings for all to authenticated using (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.created_by = auth.uid()))) with check (exists (select 1 from public.report_definitions rd where rd.id = report_id and (public.is_manager_or_admin(auth.uid()) OR rd.created_by = auth.uid())));

-- 8) dashboards
create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_public boolean not null default false,
  created_by uuid not null,
  updated_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists idx_dashboards_created_by on public.dashboards(created_by);
create index if not exists idx_dashboards_public on public.dashboards(is_public);
alter table public.dashboards enable row level security;
drop policy if exists "dashboards_select" on public.dashboards;
create policy "dashboards_select" on public.dashboards for select to authenticated using (public.is_manager_or_admin(auth.uid()) OR is_public = true OR created_by = auth.uid());
drop policy if exists "dashboards_write" on public.dashboards;
create policy "dashboards_write" on public.dashboards for all to authenticated using (public.is_manager_or_admin(auth.uid()) OR created_by = auth.uid()) with check (public.is_manager_or_admin(auth.uid()) OR created_by = auth.uid());

-- 9) dashboard_blocks
create table if not exists public.dashboard_blocks (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  report_id uuid not null references public.report_definitions(id) on delete restrict,
  visualization_type text not null check (visualization_type in ('card','table','line_chart','bar_chart','pie_chart','area_chart')),
  title text,
  config_json jsonb not null default '{}'::jsonb,
  position_x int not null default 0,
  position_y int not null default 0,
  width int not null default 6,
  height int not null default 4,
  sort_order int not null default 0
);
create index if not exists idx_dashboard_blocks_dashboard_id on public.dashboard_blocks(dashboard_id);
create index if not exists idx_dashboard_blocks_report_id on public.dashboard_blocks(report_id);
alter table public.dashboard_blocks enable row level security;
drop policy if exists "dashboard_blocks_select" on public.dashboard_blocks;
create policy "dashboard_blocks_select" on public.dashboard_blocks for select to authenticated using (exists (select 1 from public.dashboards d where d.id = dashboard_id and (public.is_manager_or_admin(auth.uid()) OR d.is_public = true OR d.created_by = auth.uid())));
drop policy if exists "dashboard_blocks_write" on public.dashboard_blocks;
create policy "dashboard_blocks_write" on public.dashboard_blocks for all to authenticated using (exists (select 1 from public.dashboards d where d.id = dashboard_id and (public.is_manager_or_admin(auth.uid()) OR d.created_by = auth.uid()))) with check (exists (select 1 from public.dashboards d where d.id = dashboard_id and (public.is_manager_or_admin(auth.uid()) OR d.created_by = auth.uid())));

-- 10) ai_events
create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  model text not null,
  prompt_version text,
  input_summary text,
  output_json jsonb not null default '{}'::jsonb,
  score numeric,
  tokens_used int,
  latency_ms int,
  trace_id text,
  department_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_events_entity on public.ai_events(entity_type, entity_id);
create index if not exists idx_ai_events_created_at on public.ai_events(created_at);
create index if not exists idx_ai_events_department on public.ai_events(department_id);
alter table public.ai_events enable row level security;
drop policy if exists "ai_events_select_admin_manager" on public.ai_events;
create policy "ai_events_select_admin_manager" on public.ai_events for select to authenticated using (public.is_manager_or_admin(auth.uid()));
drop policy if exists "ai_events_write_admin_manager" on public.ai_events;
create policy "ai_events_write_admin_manager" on public.ai_events for all to authenticated using (public.is_manager_or_admin(auth.uid())) with check (public.is_manager_or_admin(auth.uid()));

-- SEEDS
insert into public.data_catalog (entity, field_name, field_type, label, description, is_sensitive, allow_filter, allow_group, allow_aggregate, category, sort_order)
values
  ('deals','id','uuid','ID do Deal','Identificador do deal',false,true,false,false,'Vendas',1),
  ('deals','amount','number','Valor','Valor monetário do deal',false,true,true,true,'Vendas',2),
  ('deals','status','text','Status','Status do deal (won/lost/open)',false,true,true,false,'Vendas',3),
  ('deals','stage_id','uuid','Etapa','Etapa do pipeline',false,true,true,false,'Vendas',4),
  ('deals','pipeline_id','uuid','Pipeline','Pipeline do deal',false,true,true,false,'Vendas',5),
  ('deals','assigned_to','uuid','Responsável','Usuário responsável',false,true,true,false,'Vendas',6),
  ('deals','created_at','date','Criado em','Data de criação',false,true,true,false,'Vendas',7),
  ('deals','won_at','date','Ganho em','Data de ganho',false,true,true,false,'Vendas',8),
  ('deals','lost_at','date','Perdido em','Data de perda',false,true,true,false,'Vendas',9),
  ('contacts','id','uuid','ID do Contato','Identificador do contato',false,true,false,false,'CRM',1),
  ('contacts','name','text','Nome','Nome do contato',false,true,true,false,'CRM',2),
  ('contacts','email','text','Email','Email do contato',true,true,true,false,'CRM',3),
  ('contacts','phone','text','Telefone','Telefone do contato',true,true,true,false,'CRM',4),
  ('contacts','source','text','Origem','Origem do lead',false,true,true,false,'CRM',5),
  ('contacts','company','text','Empresa','Empresa do contato',false,true,true,false,'CRM',6)
on conflict (entity, field_name) do nothing;

insert into public.semantic_metrics (name, label, description, entity_base, expression_type, numerator_field, denominator_field, default_filters)
values
  ('taxa_conversao_deals','Taxa de Conversão (Deals)','Won / Total de deals criados no período','deals','ratio','status:won','id','{}'::jsonb),
  ('receita_total','Receita Total','Soma do amount para deals ganhos','deals','sum','amount',null,'{"status":"won"}'::jsonb)
on conflict (name) do nothing;
