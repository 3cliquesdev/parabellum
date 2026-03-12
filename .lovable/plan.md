

# Fix: Badge "Não Cliente" → "Cliente" não atualiza em tempo real

## Problema

A `inbox_view` (tabela materializada usada na lista de conversas) **não possui** as colunas `contact_status` e `contact_kiwify_validated`. O mapper `inboxItemToConversation` no `Inbox.tsx` (L225, L242) hardcoda ambos como `null`, então o badge sempre mostra "Não Cliente" mesmo após a validação.

## Correção

### 1. Migration: Adicionar colunas + trigger + backfill

- Adicionar `contact_status TEXT` e `contact_kiwify_validated BOOLEAN` à tabela `inbox_view`
- Backfill com dados atuais dos contacts
- Criar trigger `sync_inbox_view_contact_status` na tabela `contacts` que, ao detectar mudança em `status` ou `kiwify_validated`, atualiza todas as linhas correspondentes em `inbox_view` via `contact_id`
- Atualizar os triggers existentes de upsert na `inbox_view` (`update_inbox_view_on_message`) para popular esses campos no INSERT

### 2. Frontend: Mapear novos campos

No `Inbox.tsx`, função `inboxItemToConversation` (~L225, L242):
- `kiwify_validated: item.contact_kiwify_validated ?? null`
- `status: item.contact_status ?? null`

### 3. Realtime

O trigger na tabela `contacts` faz UPDATE na `inbox_view`, que já tem subscription realtime ativa. Quando o `process-chat-flow` atualiza o contact para `customer` e `kiwify_validated = true`, o trigger propaga para `inbox_view`, o realtime detecta a mudança, e o cache do React Query é atualizado automaticamente — badge muda instantaneamente.

## Arquivos

- `supabase/migrations/` — nova migration SQL
- `src/pages/Inbox.tsx` — mapper `inboxItemToConversation` (2 linhas)

