
# 6 Correções Cirúrgicas no process-chat-flow — CONCLUÍDO (10/03/2026)

## Arquivo: `supabase/functions/process-chat-flow/index.ts`

### FIX 1 ✅ — Proteção contra loop flow-to-flow
### FIX 2 ✅ — condition_v2 reconhecido como waiting_input
### FIX 3 ✅ — Auto-traverse cobre condition_v2
### FIX 4 ✅ — Transfer node atualiza conversations.department
### FIX 5 ✅ — startMessage com replaceVariables
### FIX 6 ✅ — financialIntentPattern simplificado

---

# FIX 7 ✅ — aiExitForced segue próximo nó do chat flow (10/03/2026)

## Problema
Quando a IA no nó `ia_entrada` faz handoff (`forceAIExit`), o `findNextNode` busca edge `ai_exit` que não existe no Master Flow → conversa fica presa.

## Correções aplicadas

### 7a — Fallback edge default (process-chat-flow ~L2273)
Se `aiExitForced && !nextNode && path === 'ai_exit'`, tenta `findNextNode` com `path=undefined` (edge default).

### 7b — Guard final sem nó (process-chat-flow ~L2336)
Se mesmo com fallback não encontrou próximo nó, força handoff genérico com `department_id` do nó ou null.

### 7c — Safety net IA falha (process-buffered-messages ~L383)
Quando `ai-autopilot-chat` retorna HTTP error com flow ativo, re-invoca `process-chat-flow` com `forceAIExit: true`.

### 7d — Safety net IA falha (handle-whatsapp-event ~L1272)
Mesmo safety net no webhook Evolution: se `aiError` com flow context, re-invoca e envia mensagem do próximo nó.

---

# FIX 8 ✅ — pg_cron matando flows prematuramente (11/03/2026)

## Problema
O pg_cron `cleanup-stuck-flow-states` usava `started_at < now() - 3 min`, mas `started_at` é imutável. Flows com múltiplos passos (>3min) eram mortos antes de chegar ao nó de transfer.

## Correções aplicadas

### 8a — Coluna `updated_at` em `chat_flow_states`
Nova coluna `updated_at timestamptz DEFAULT now()` adicionada via migration. Registros existentes backfilled com `COALESCE(completed_at, started_at)`.

### 8b — `updated_at` em todos os `.update()` do process-chat-flow
21 pontos de atualização no `process-chat-flow/index.ts` agora incluem `updated_at: new Date().toISOString()`, renovando o timestamp a cada interação.

### 8c — pg_cron precisa ser atualizado manualmente
O cron deve usar `updated_at < now() - INTERVAL '15 minutes'` em vez de `started_at < now() - 3 min`.

SQL para executar manualmente no SQL Editor:
```sql
DELETE FROM cron.job WHERE jobname = 'cleanup-stuck-flow-states';
SELECT cron.schedule(
  'cleanup-stuck-flow-states',
  '*/3 * * * *',
  $$
    UPDATE public.chat_flow_states
    SET status = 'transferred', completed_at = now()
    WHERE status IN ('waiting_input', 'active', 'in_progress')
      AND updated_at < now() - INTERVAL '15 minutes'
      AND conversation_id IN (
        SELECT id FROM public.conversations WHERE status = 'open'
      );
  $$
);
```
