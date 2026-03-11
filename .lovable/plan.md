

# Fix: pg_cron matando flows ativos prematuramente

## Problema raiz

O pg_cron `cleanup-stuck-flow-states` usa `started_at < now() - 3 minutes`, mas `started_at` é imutável (definido na criação do flow). Qualquer fluxo que dure mais de 3 minutos (ex: usuário demora para responder menu) é marcado como `transferred` pelo cron **antes de chegar ao nó de transfer**.

Resultado: conversa vai para `waiting_human` sem executar o nó de transferência do canvas (sem departamento correto, sem mensagem, sem consultor).

## Solução

### 1. Adicionar coluna `updated_at` na tabela `chat_flow_states`

```sql
ALTER TABLE public.chat_flow_states 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Preencher registros existentes
UPDATE public.chat_flow_states SET updated_at = COALESCE(completed_at, started_at);
```

### 2. Atualizar o pg_cron para usar `updated_at` em vez de `started_at`

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

Mudanças chave:
- **`updated_at`** em vez de `started_at` — reflete última interação real
- **15 minutos** em vez de 3 — margem realista para fluxos com múltiplos passos

### 3. Atualizar `updated_at` no `process-chat-flow/index.ts`

Em TODOS os `.update()` do `chat_flow_states`, adicionar `updated_at: new Date().toISOString()` para que cada interação renove o timestamp. São ~10 pontos no código onde o estado é atualizado.

## Arquivos afetados

| Componente | Mudança |
|---|---|
| Database | Nova coluna `updated_at` + cron atualizado |
| `process-chat-flow/index.ts` | Adicionar `updated_at` em todos os `.update()` de `chat_flow_states` |

## Resultado esperado

- Flows ativos com interação recente NÃO são mortos pelo cron
- Flows genuinamente presos (sem interação há 15 min) são limpos
- Transferências seguem o caminho correto do canvas (nó transfer com departamento/consultor)

