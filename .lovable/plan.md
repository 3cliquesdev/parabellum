
# Notificacao Interna Completa para Tickets (Email + Sino + Dedupe + Bugfixes)

## Resumo

Corrigir bugs existentes nas insercoes de notificacoes (campos inexistentes), adicionar tabela de dedupe, implementar fallback de email via auth.users, hardening de RLS, e criar componente NotificationBell no header.

## 1. Migration SQL

### 1.1 Tabela de dedupe `ticket_notification_sends`

```sql
CREATE TABLE IF NOT EXISTS public.ticket_notification_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_event_id UUID NOT NULL REFERENCES public.ticket_events(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','in_app')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_event_id, recipient_user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_tns_event ON ticket_notification_sends(ticket_event_id);
CREATE INDEX IF NOT EXISTS idx_tns_recipient ON ticket_notification_sends(recipient_user_id);

ALTER TABLE ticket_notification_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON ticket_notification_sends FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read own"
  ON ticket_notification_sends FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));
```

### 1.2 Backfill `notifications.read`

```sql
UPDATE public.notifications SET read = false WHERE read IS NULL;
```

## 2. Bugfix: `notify-internal-comment/index.ts`

A funcao insere campos que NAO existem na tabela `notifications`:
- `reference_type` -- nao existe
- `reference_id` -- nao existe
- `is_read: false` -- o campo correto e `read`

Corrigir para:
- Remover `reference_type` e `reference_id` dos inserts
- Mover essas infos para dentro de `metadata`
- Trocar `is_read: false` por `read: false`

```typescript
// ANTES
{
  user_id: user.id,
  title: ...,
  message: ...,
  type: 'internal_comment',
  reference_type: 'ticket',
  reference_id: ticket_id,
  is_read: false,
}

// DEPOIS
{
  user_id: user.id,
  title: ...,
  message: ...,
  type: 'internal_comment',
  metadata: { ticket_id, ticket_number: ticket.ticket_number },
  read: false,
}
```

## 3. Upgrade: `notify-ticket-event/index.ts`

### 3.1 Corrigir insert de notifications (remover `reference_id`)

O insert atual usa `reference_id` que nao existe na tabela. Mover para `metadata`.

### 3.2 Dedupe para in_app tambem

Quando `ticket_event_id` existir, verificar dedupe antes de inserir notificacao in_app (alem do email que ja tem).

### 3.3 Fallback de email via auth.admin

Para recipients sem `profiles.email`, buscar via `supabase.auth.admin.getUserById()`.

### 3.4 Adicionar `ticket_created` ao handler do RealtimeNotifications

O `handleGeneralNotification` no frontend ja trata `ticket_status` e `ticket_transfer`. Adicionar case para `ticket_created` com navegacao para o ticket.

## 4. `RealtimeNotifications.tsx` -- Tratar `ticket_created`

Adicionar case `'ticket_created'` no switch de `handleGeneralNotification` para mostrar toast com link para o ticket.

## 5. Componente `NotificationBell` no header

Criar `src/components/NotificationBell.tsx`:
- Buscar `notifications` filtrando `user_id = auth.uid()`, `read = false`, ultimas 20
- Badge com contagem de nao lidas
- Dropdown (Popover) com lista de notificacoes
- Ao clicar em notificacao: marcar `read = true` e navegar conforme `metadata.ticket_id`
- Botao "Marcar todas como lidas"
- Realtime subscription para atualizar em tempo real

Integrar no `Layout.tsx` no header, ao lado do indicador de conexao.

## Secao Tecnica

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Nova tabela `ticket_notification_sends` + backfill read |
| `supabase/functions/notify-internal-comment/index.ts` | Bugfix: remover campos inexistentes, usar `read: false` + `metadata` |
| `supabase/functions/notify-ticket-event/index.ts` | Bugfix `reference_id`, dedupe in_app, fallback email auth.admin |
| `src/components/RealtimeNotifications.tsx` | Adicionar case `ticket_created` |
| `src/components/NotificationBell.tsx` | Novo componente (sino com badge + dropdown) |
| `src/components/Layout.tsx` | Integrar NotificationBell no header |

### Redeploy necessario
- `notify-internal-comment`
- `notify-ticket-event`

### Impacto
- Corrige bug silencioso: inserts de notificacoes que falhavam por campos inexistentes
- Adiciona sino funcional com badge de nao lidas
- Email fallback garante entrega mesmo sem `profiles.email`
- Dedupe protege contra retry/double-click
- RLS restritivo: usuarios so veem seus proprios envios
- Zero quebra de comportamento existente
