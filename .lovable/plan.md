

# Hardening Final: NOT NULL + Boot Fix + Dedupe 23505

## Resumo

3 ajustes cirurgicos para fechar as ultimas brechas de producao. Tudo que o usuario pediu (RLS, realtime, default) ja esta implementado -- restam apenas estes pontos.

## Status Atual (ja OK)

- `notifications.read` tem DEFAULT false
- RLS na `notifications`: SELECT own, UPDATE own, INSERT service -- correto
- `notifications` esta na publication `supabase_realtime` -- sino atualiza em tempo real
- `notify-internal-comment` ja usa `read: false` e `metadata` (bugfix anterior aplicado)
- `notify-ticket-event` ja usa `read: false`, dedupe, fallback email

## Mudancas Necessarias

### 1. Migration: `notifications.read` SET NOT NULL

O campo `read` e nullable (YES). Isso pode causar `read = NULL` em inserts futuros que nao passem o campo. Travar com NOT NULL apos backfill (ja feito).

```sql
ALTER TABLE public.notifications ALTER COLUMN read SET NOT NULL;
```

### 2. `notify-internal-comment/index.ts` -- Boot Hardening

A funcao usa imports que violam as regras de estabilidade:
- `import { serve } from "https://deno.land/std@0.190.0/http/server.ts"` -- trocar por `Deno.serve`
- `import { createClient } from "npm:@supabase/supabase-js@2"` -- trocar por `https://esm.sh/@supabase/supabase-js@2.49.1`

Isso previne 503 BOOT_ERROR em producao.

### 3. `notify-ticket-event/index.ts` -- Dedupe com tratamento explicito de 23505

O codigo atual usa `ignoreDuplicates: true` no upsert, mas nao trata o erro 23505 explicitamente. Em cenarios de race condition (2 requests simultaneos), o Supabase pode retornar erro ao inves de ignorar silenciosamente.

Trocar de:

```typescript
const { data: inserted } = await supabase
  .from("ticket_notification_sends")
  .upsert(...)
  .select("id");
if (!inserted || inserted.length === 0) return false;
```

Para:

```typescript
const { data: inserted, error: dedupeError } = await supabase
  .from("ticket_notification_sends")
  .upsert(...)
  .select("id");
if (dedupeError) {
  if (dedupeError.code === '23505') return false; // duplicate = already sent
  console.warn('[notify-ticket-event] Dedupe error:', dedupeError);
  return false; // fail safe: don't send twice
}
if (!inserted || inserted.length === 0) return false;
```

Aplicar em ambos os blocos (in_app e email).

## Secao Tecnica

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | `ALTER COLUMN read SET NOT NULL` |
| `supabase/functions/notify-internal-comment/index.ts` | Trocar imports para esm.sh + Deno.serve |
| `supabase/functions/notify-ticket-event/index.ts` | Adicionar tratamento 23505 no dedupe |

### Redeploy necessario
- `notify-internal-comment`
- `notify-ticket-event`

### Impacto
- NOT NULL impede inserts futuros com read=NULL (zero regressao, backfill ja feito)
- Boot hardening previne 503 em deploy/cold start
- Dedupe 23505 protege contra race condition em requests simultaneos
- Zero quebra de comportamento existente
