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

**Parcialmente resolvido**: `useConversas.ts` agora restringe a visibilidade do Inbox
por cargo — quem não é `owner`/`gerente` só vê conversas atribuídas a si mesmo ou
não-atribuídas do próprio departamento (via `agent_departments`), igual a referência.
Ainda falta: RBAC por módulo (ex: só `financeiro`/`gerente_financeiro` acessarem uma
futura tela financeira, `marketing`/`gerente_marketing` não mexerem em departamentos)
— hoje isso é tudo-ou-nada fora do Inbox (qualquer membro autenticado acessa qualquer
tela do app).

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

## SLA fixo (30min), não configurável por departamento

O filtro "SLA Excedido" do Inbox usa um limite fixo de 30 minutos sem resposta humana
pra qualquer departamento. Na referência isso é configurável por departamento (Suporte
pode ter SLA mais agressivo que Comercial, por exemplo). Fica pendente até fazer
sentido diferenciar.

## Advanced filter popover unificado

A referência tem um botão "Filtros" que abre um painel único combinando canal, status
(aberto/pendente/resolvido), modo IA, departamento, atendente e tags numa aba só. Aqui
cada um desses virou um dropdown separado no cabeçalho do Inbox (mais simples de
implementar, mesma cobertura funcional) — uma unificação num popover só fica pra uma
passada de polish visual futura.

## `negocios` enxuta (sem campos de reconciliação Kiwify)

A tabela `negocios` criada aqui tem só `titulo/valor/estagio/origem/assigned_to/
motivo_perda` — a referência tem 44 colunas incluindo reconciliação financeira com a
Kiwify (`gross_value`, `kiwify_fee`, `affiliate_commission`, rastreio de "negócio
ficou podre" com `became_rotten_at`). Não trouxemos porque não tem uso ainda — a
reconciliação de venda já é coberta separadamente pela tabela `vendas` (webhook da
Kiwify). Se um dia precisar linkar negócio↔venda de verdade, é aqui que entra.

## WhatsApp: Etapa 2 (template fora da janela de 24h)

O Meta só deixa reabrir uma conversa depois de 24h sem contato do cliente usando um
"template" pré-aprovado pela própria Meta (mensagem estruturada, não texto livre).
Isso não foi implementado — hoje só respondemos dentro da janela de 24h. Fica pra uma
próxima rodada: cadastro/gestão de templates aprovados + UI pra escolher qual mandar
quando a conversa esfriou.

## WhatsApp: um número só por tenant

`whatsapp_configs` tem `UNIQUE(tenant_id)` — só permite 1 número de WhatsApp conectado
por tenant. A referência tem uma tabela sem essa trava, permitindo N números (um por
vendedor/departamento). Se um dia precisar de múltiplos números na mesma conta, essa
constraint (e todo lookup que hoje busca config só por `tenant_id`, sem considerar
`phone_number_id`) precisa ser revisto.

## WhatsApp: envio de localização e contato (vCard)

Recebemos localização do cliente normalmente, mas não implementamos enviar localização
ou contato de volta — nem a própria referência tem isso no envio, só no recebimento.
Baixa prioridade.
