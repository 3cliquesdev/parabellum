

## Notificacao de Aprovacao para Gestores Financeiros

### Problema
Quando um ticket e enviado para aprovacao (`pending_approval`), a edge function `notify-ticket-event` ignora o evento `approval_requested` porque:
1. Nao esta na lista `notifiableEvents` (linha 194)
2. Nao tem case no switch de titulo/mensagem
3. Nao busca gestores financeiros/admins como destinatarios -- so notifica stakeholders existentes

### Solucao

**1. Edge Function: `supabase/functions/notify-ticket-event/index.ts`**

- Adicionar `approval_requested` ao type do `TicketEventPayload`
- Adicionar `approval_requested` ao array `notifiableEvents`
- Adicionar case no switch para titulo/mensagem:
  - Titulo: "Aprovacao Financeira Pendente"
  - Mensagem: "Ticket #XXX aguarda aprovacao de reembolso. Solicitado por YYY."
  - Tipo: `ticket_status`
- Adicionar logica especifica para `approval_requested`: buscar usuarios com roles `financial_manager`, `admin`, `general_manager` na tabela `user_roles` e adicioná-los ao `usersToNotify`
- Enviar tanto `in_app` quanto `email` (channels)

**2. Hook: `src/hooks/useRequestApproval.tsx`**

- Atualizar a chamada ao `notify-ticket-event` para incluir `channels: ["email", "in_app"]` para garantir que gestores recebam email alem da notificacao in-app
- Criar um `ticket_event` antes de chamar a edge function para habilitar deduplicacao

### Detalhes Tecnicos

Na edge function, ao detectar `event_type === 'approval_requested'`:

```text
1. Buscar user_ids com roles relevantes:
   SELECT user_id FROM user_roles WHERE role IN ('admin', 'financial_manager', 'general_manager')

2. Adicionar todos ao usersToNotify (incluindo stakeholders existentes)

3. Gerar notificacao com:
   - title: "Aprovacao Financeira Pendente"
   - message: "Ticket #TK-XXXX aguarda aprovacao de reembolso..."
   - metadata.action_url: /support?ticket={ticket_id}
```

No hook `useRequestApproval`:

```text
1. Inserir ticket_event com event_type = 'approval_requested'
2. Passar ticket_event_id na chamada da edge function
3. Incluir channels: ["email", "in_app"]
```

### Impactos
- Sem downgrade: eventos existentes continuam funcionando
- Upgrade: gestores financeiros recebem notificacao in-app + email quando ticket precisa de aprovacao
- Deduplicacao mantida via ticket_notification_sends

