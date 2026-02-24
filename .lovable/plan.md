
# Corrigir Gravacao do template_id na Tabela email_sends

## Problema
O campo `template_id` foi removido do payload de insert em `email_sends` na Edge Function `send-email/index.ts` (linhas 261-272). O comentario diz que uma FK causava erros, mas a FK ja foi removida da tabela -- nao existe mais nenhuma foreign key em `email_sends`. Resultado: 12.073 emails enviados com `template_id = NULL`.

## Solucao

### Arquivo: `supabase/functions/send-email/index.ts`

Adicionar de volta o campo `template_id` no payload de insert do `email_sends` (linha ~262-273):

**Antes:**
```typescript
const emailSendPayload = {
  contact_id: customer_id,
  resend_email_id: resendData.id,
  subject,
  recipient_email: to,
  status: 'sent',
  sent_at: new Date().toISOString(),
  variables_used: { to_name: recipientName, branding: brandName },
  playbook_execution_id: playbook_execution_id || null,
  playbook_node_id: playbook_node_id || null,
  // template_id removido - FK causava erros quando template não existe em email_templates_v2
};
```

**Depois:**
```typescript
const emailSendPayload = {
  contact_id: customer_id,
  resend_email_id: resendData.id,
  subject,
  recipient_email: to,
  status: 'sent',
  sent_at: new Date().toISOString(),
  variables_used: { to_name: recipientName, branding: brandName },
  playbook_execution_id: playbook_execution_id || null,
  playbook_node_id: playbook_node_id || null,
  template_id: request_template_id || null,
};
```

A variavel `request_template_id` ja existe no destructuring do request (linha ~49). Basta adiciona-la ao payload.

## Impacto
- Apenas adiciona um campo nullable que ja existe na tabela
- Nao ha FK -- nenhum risco de erro de constraint
- Emails futuros passarao a ser rastreados por template
- Emails antigos continuam com `template_id = NULL` (sem efeito retroativo)
- Zero impacto em features existentes
