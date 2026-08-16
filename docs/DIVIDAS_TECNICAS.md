# Dívidas técnicas

Pendências identificadas comparando este projeto com a referência real (Lovable
`parabellum-by3cliques`), pra não perder o contexto de por que existem e o que falta.

## Tela de CRUD de departamentos

Hoje `departments` só é populado via migration (seed manual dos 7 departamentos:
Comercial Nacional/Internacional, Suporte + Suporte Pedidos/Suporte Sistema, Financeiro,
Customer Success). Não existe UI nem rota (`POST`/`PATCH`/`DELETE`) pra criar, renomear,
mudar cor ou desativar um departamento — só `GET /api/departments`.

O que falta: uma seção em Configurações (irmã de "Equipe") com lista + formulário de
criar/editar, e as rotas de escrita correspondentes em `src/app/api/departments/`.

## Permissões diferenciadas por cargo

Todos os cargos não-`owner` (`gerente`, `vendedor`, `atendente`, `consultor`,
`gerente_suporte`, `gerente_cs`, `gerente_financeiro`, `financeiro`,
`gerente_marketing`, `marketing`, `analista_ecommerce`, `gerente_geral`) caem hoje no
mesmo balde de permissão "membro padrão" — só mudam o rótulo/cor exibidos, não o que a
pessoa pode fazer no sistema. A referência tem um RBAC mais granular por cargo (ex:
`financial_manager` vê módulo financeiro, `marketing_agent` não mexe em departamentos).

## Hierarquia gerente → consultor (`manager_id`)

A referência tem `profiles.manager_id` (cada consultor/atendente aponta pro gerente
responsável), usado pra dashboards de equipe e escalonamento. Não existe equivalente em
`tenant_members` aqui ainda.

## Config de auto-close/alertas por departamento

Hoje o auto-close por inatividade é uma config única por tenant
(`tenants.auto_close_inatividade_ativo`/`auto_close_inatividade_minutos`). Na
referência, `departments` tem isso por departamento (`auto_close_minutes`,
`ai_auto_close_minutes`, `human_auto_close_minutes` + tags específicas por motivo de
fechamento, `slow_response_alert_*`, `after_hours_keep_open`, limites de tempo ausente
por agente). Fica pra quando cada departamento precisar de regras diferentes (ex:
Suporte com SLA mais agressivo que Comercial).

## Disponibilidade "ocupado" (busy)

`tenant_members.availability_status` aceita hoje `online`/`away`/`offline`. A
referência tem um quarto estado, `busy`, distinto de `away` (ausente por escolha vs.
ocupado atendendo). Avaliar se vale adicionar quando o volume de atendimento justificar.
