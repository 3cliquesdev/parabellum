

# Email de Confirmação para o Cliente ao Criar Ticket

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico

O sistema **não envia email para o cliente** quando um ticket é criado. A Edge Function `notify-ticket-event` notifica apenas **stakeholders internos** (agentes, admins) — usuários com conta no sistema. O cliente (tabela `contacts`) não é incluído na lista de destinatários.

| O que existe | Para quem |
|---|---|
| `notify-ticket-event` → email + in_app | Agentes/admins internos |
| `send-ticket-email-reply` | Cliente (mas só para respostas manuais) |
| Email ao criar ticket para o cliente | **NÃO EXISTE** |

## Solução

Adicionar ao fluxo de `notify-ticket-event`, no evento `created`, um **email de confirmação para o cliente** (contato) quando `customer_id` estiver presente e o contato tiver email.

### Mudança única: `supabase/functions/notify-ticket-event/index.ts`

Após o bloco de emails internos (linha ~490), adicionar:

1. Verificar se `ticket.customer_id` existe
2. Buscar email do contato na tabela `contacts`
3. Se tiver email, buscar branding configurado (`email_branding` + `email_senders`)
4. Enviar email via Resend com template de confirmação: "Seu ticket #XXX foi criado com sucesso"
5. Dedupe via `ticket_notification_sends` com channel `email_customer`

### Conteúdo do email para o cliente

- Assunto: `Ticket #XXX criado — {subject}`
- Corpo: saudação com nome do cliente, número do ticket, assunto, e instrução de que será atendido em breve
- Branding: usa o `email_branding` e `email_senders` já configurados (mesmo visual do `send-ticket-email-reply`)
- Link para acompanhar: `/my-tickets` (se o portal estiver ativo)

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/notify-ticket-event/index.ts` | Adicionar envio de email de confirmação ao cliente no evento `created` |

## Impacto
- **Zero regressão**: emails internos continuam iguais
- **Upgrade**: cliente recebe confirmação automática por email ao ter ticket aberto
- **Segurança**: usa Resend API já configurada, sem expor dados sensíveis
- **Deduplicação**: protegido contra envio duplicado via `ticket_notification_sends`

