

# Roteamento Completo no Sino de Notificacoes + action_url Universal

## Resumo

Corrigir metadata em **todos** os producers de notificacoes (Edge Functions) para incluir `action_url`, e refatorar o `NotificationBell` para navegar corretamente por qualquer tipo de notificacao.

---

## 1. BACKEND -- Corrigir `ticket_reply` (bug principal)

### A) `supabase/functions/inbound-email/index.ts` (2 pontos)

**Linha ~384** -- adicionar `metadata` com `ticket_id`, `ticket_number` e `action_url`:

```typescript
// ANTES
await supabase.from("notifications").insert({
  user_id: existingTicket.assigned_to,
  title: "Nova resposta do cliente",
  message: `Cliente respondeu ao ticket #${existingTicket.id.slice(0, 8)}`,
  type: "ticket_reply",
  read: false,
});

// DEPOIS
await supabase.from("notifications").insert({
  user_id: existingTicket.assigned_to,
  title: "Nova resposta do cliente",
  message: `Cliente respondeu ao ticket #${existingTicket.id.slice(0, 8)}`,
  type: "ticket_reply",
  metadata: {
    ticket_id: existingTicket.id,
    ticket_number: existingTicket.ticket_number || null,
    action_url: `/support?ticket=${existingTicket.id}`,
  },
  read: false,
});
```

**Linha ~507** -- mesmo padrao, usando `ticketBySubject`:

```typescript
await supabase.from("notifications").insert({
  user_id: ticketBySubject.assigned_to,
  title: "Nova resposta do cliente",
  message: `Cliente respondeu ao ticket #${ticketBySubject.id.slice(0, 8)}`,
  type: "ticket_reply",
  metadata: {
    ticket_id: ticketBySubject.id,
    ticket_number: ticketBySubject.ticket_number || null,
    action_url: `/support?ticket=${ticketBySubject.id}`,
  },
  read: false,
});
```

### B) `supabase/functions/add-customer-comment/index.ts` (2 pontos)

Trocar `reference_id` (legado) por `metadata` nos dois inserts (linhas 142 e 155):

```typescript
// ANTES
notificationsToInsert.push({
  user_id: ticket.assigned_to,
  title: 'Nova resposta do cliente',
  message: `Cliente respondeu ao ticket #${ticketRef}`,
  type: 'ticket_reply',
  reference_id: ticket_id,  // LEGADO
  read: false
});

// DEPOIS
notificationsToInsert.push({
  user_id: ticket.assigned_to,
  title: 'Nova resposta do cliente',
  message: `Cliente respondeu ao ticket #${ticketRef}`,
  type: 'ticket_reply',
  metadata: {
    ticket_id,
    ticket_number: ticket.ticket_number || null,
    action_url: `/support?ticket=${ticket_id}`,
  },
  read: false
});
```

Mesmo para o segundo insert (criador do ticket, linha 155).

---

## 2. BACKEND -- Adicionar `action_url` nos demais producers

### `supabase/functions/notify-ticket-event/index.ts`

O `notifMetadata` (linha 232) ja tem `ticket_id` e `ticket_number`. Adicionar `action_url`:

```typescript
const notifMetadata = {
  ticket_id,
  ticket_number: ticket.ticket_number,
  event_type,
  actor_name: actorName,
  priority: ticket.priority,
  status: ticket.status,
  action_url: `/support?ticket=${ticket_id}`,  // NOVO
};
```

### `supabase/functions/notify-internal-comment/index.ts`

Adicionar `action_url` no metadata das notificacoes (linha ~91):

```typescript
metadata: {
  ticket_id,
  ticket_number: ticket.ticket_number,
  action_url: `/support?ticket=${ticket_id}`,  // NOVO
},
```

### `supabase/functions/ai-autopilot-chat/index.ts` (2 pontos)

**Linha ~6050** (vendedor direto):
```typescript
metadata: {
  conversation_id: conversationId,
  deal_id: dealId,
  email: emailInformado,
  source: responseChannel,
  action_url: `/inbox?conversation=${conversationId}`,  // NOVO
},
```

**Linha ~6082** (broadcast comercial):
```typescript
metadata: {
  conversation_id: conversationId,
  deal_id: dealId,
  email: emailInformado,
  action_url: `/inbox?conversation=${conversationId}`,  // NOVO
},
```

### `supabase/functions/kiwify-webhook/index.ts` (2 pontos)

**Linha ~797** (`payment_pending_validation`):
```typescript
metadata: {
  deal_id: matchingDeal.id,
  // ... campos existentes ...
  action_url: `/deals?deal=${matchingDeal.id}`,  // NOVO
},
```

**Linha ~2086** (`subscription_renewal`):
```typescript
metadata: {
  // ... campos existentes ...
  action_url: `/deals`,  // NOVO (renewal nao tem deal_id direto)
},
```

### `supabase/functions/process-pending-deal-closures/index.ts`

**Linha ~101** -- adicionar `action_url`:
```typescript
metadata: {
  deal_id: deal.id,
  deal_title: deal.title,
  value: deal.value,
  action_url: `/deals?deal=${deal.id}`,  // NOVO
},
```

### `supabase/functions/extract-knowledge-from-chat/index.ts`

**Linha ~272** -- adicionar `action_url`:
```typescript
metadata: {
  // ... campos existentes ...
  action_url: '/settings/ai-audit',  // NOVO
},
```

### `supabase/functions/train-ai-pair/index.ts`

**Linha ~87** -- adicionar `action_url`:
```typescript
metadata: {
  article_id: article.id,
  source: source,
  action_url: '/settings/ai-audit',  // NOVO
},
```

### `supabase/functions/check-rotten-deals/index.ts`

Ja usa `link` em vez de `metadata.action_url` (linhas 143 e 155). Mover para dentro de metadata:

```typescript
// ANTES
notifications.push({
  user_id: deal.assigned_to,
  title: "...",
  message: "...",
  type: "deal_critical",
  link: `/deals?dealId=${deal.id}`,
});

// DEPOIS
notifications.push({
  user_id: deal.assigned_to,
  title: "...",
  message: "...",
  type: "deal_critical",
  metadata: {
    deal_id: deal.id,
    action_url: `/deals?dealId=${deal.id}`,
  },
  read: false,
});
```

Mesmo para `deal_warning` (linha 150-156).

---

## 3. FRONTEND -- `src/components/NotificationBell.tsx`

### A) Helper de roteamento universal

Nova funcao `getNotificationTarget` -- prioriza `action_url`, fallback por type:

```typescript
function getNotificationTarget(n: Notification): string | null {
  const md = (n.metadata ?? {}) as any;

  // Universal: action_url tem prioridade
  if (md.action_url) return md.action_url;

  // Fallback por type
  switch (n.type) {
    case 'ticket_created':
    case 'ticket_status':
    case 'ticket_transfer':
    case 'ticket_reply':
    case 'internal_comment':
      return md.ticket_id ? `/support?ticket=${md.ticket_id}` : null;
    case 'new_lead':
      return md.conversation_id
        ? `/inbox?conversation=${md.conversation_id}`
        : '/inbox';
    case 'payment_pending_validation':
    case 'subscription_renewal':
    case 'deal_marked_organic':
    case 'deal_critical':
    case 'deal_warning':
      return md.deal_id ? `/deals?deal=${md.deal_id}` : '/deals';
    case 'knowledge_approval':
    case 'ai_learning':
      return '/settings/ai-audit';
    default:
      return null;
  }
}
```

### B) Refatorar `handleClick`

```typescript
const handleClick = (notif: Notification) => {
  if (!notif.read) markAsRead(notif.id);
  const target = getNotificationTarget(notif);
  if (target) navigate(target);
  setOpen(false);
};
```

### C) Adicionar tipos no `getIcon`

```typescript
case "ticket_created":
case "ticket_status":
case "ticket_transfer":
case "ticket_reply":        // NOVO
case "internal_comment":
  return <Ticket ... />;
case "new_lead":             // NOVO
  return <MessageSquare ... />;
case "deal_critical":        // NOVO
case "deal_warning":         // NOVO
case "deal_marked_organic":  // NOVO
case "payment_pending_validation":
  return <Info ... />;
```

---

## Resumo de arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/inbound-email/index.ts` | +metadata com ticket_id e action_url (2 inserts) |
| `supabase/functions/add-customer-comment/index.ts` | reference_id -> metadata (2 inserts) |
| `supabase/functions/notify-ticket-event/index.ts` | +action_url no notifMetadata |
| `supabase/functions/notify-internal-comment/index.ts` | +action_url no metadata |
| `supabase/functions/ai-autopilot-chat/index.ts` | +action_url (2 inserts) |
| `supabase/functions/kiwify-webhook/index.ts` | +action_url (2 inserts) |
| `supabase/functions/process-pending-deal-closures/index.ts` | +action_url |
| `supabase/functions/extract-knowledge-from-chat/index.ts` | +action_url |
| `supabase/functions/train-ai-pair/index.ts` | +action_url |
| `supabase/functions/check-rotten-deals/index.ts` | link -> metadata.action_url + read:false (2 inserts) |
| `src/components/NotificationBell.tsx` | getNotificationTarget + handleClick + getIcon |

## Impacto

- **Zero regressao**: todos os campos existentes no metadata sao preservados, apenas adicionamos `action_url`
- **Backward compatible**: o helper do sino tem fallback por type+ids para notificacoes antigas (sem action_url)
- **Notificacoes antigas**: continuam aparecendo, so nao navegam se nao tinham metadata -- comportamento aceitavel

