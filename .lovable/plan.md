

# Correção Crítica: Message Buffer — Substituir setTimeout por Cron Persistente

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico confirmado

O `setTimeout` na linha 49-82 de `meta-whatsapp-webhook/index.ts` nunca executa porque o isolate Deno encerra após a resposta HTTP. Mensagens ficam presas em `message_buffer` com `processed=false` indefinidamente.

## Alterações (6 passos)

### 1. Remover setTimeout do webhook
**Arquivo:** `supabase/functions/meta-whatsapp-webhook/index.ts`
- Função `bufferAndSchedule()`: manter apenas o `insert` no `message_buffer` + salvar metadata (contactId, instanceId, fromNumber, flowContext, flowData) em colunas novas da tabela
- Remover todo o bloco `setTimeout` (linhas 44-82)

### 2. Adicionar colunas de metadata ao message_buffer
**Migration SQL:**
- Adicionar colunas: `contact_id`, `instance_id`, `from_number`, `flow_context (jsonb)`, `flow_data (jsonb)` — todas nullable
- Isso permite que o cron processor tenha contexto suficiente para chamar o pipeline sem depender de parâmetros passados pelo setTimeout

### 3. Reescrever process-buffered-messages com "batch scan"
**Arquivo:** `supabase/functions/process-buffered-messages/index.ts`
- Adicionar handler para chamadas sem `conversationId` (modo cron/scan):
  - Buscar conversas distintas com mensagens `processed=false`
  - Para cada conversa, verificar se `now() - max(created_at) >= batchDelaySeconds`
  - Se sim, processar (concatenar, chamar pipeline, marcar processed)
  - Se não, pular (mensagens ainda estão no período de espera)
- Usar `pg_advisory_xact_lock(hashtext(conversation_id))` via RPC para evitar processamento paralelo
- Manter o handler existente (com `conversationId`) para compatibilidade
- Em caso de erro no pipeline: logar mas NÃO marcar como processed (retry no próximo ciclo)

### 4. Registrar cron no config.toml
**Arquivo:** `supabase/config.toml`
```toml
[functions.process-buffered-messages]
verify_jwt = false

[functions.process-buffered-messages.cron]
schedule = "*/1 * * * *"
region = "us-east-1"
```
Executa a cada 1 minuto (menor granularidade suportada). Com batchDelay de 8s, a latência máxima será ~68s no pior caso.

### 5. Criar RPC para advisory lock
**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.try_lock_conversation_buffer(conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  RETURN pg_try_advisory_xact_lock(hashtext(conv_id::text));
END;
$$;
```

### 6. Reprocessar mensagens presas
Após deploy, invocar `process-buffered-messages` manualmente (via curl tool) para destravar as mensagens pendentes.

## Impactos
- **Upgrade puro**: mensagens nunca mais ficam presas
- **Sem regressão**: fluxo direto (batchDelay=0) não é alterado — só usa buffer quando delay > 0
- **Latência**: máximo ~68s (8s delay + até 60s do cron). Aceitável para batching
- **Idempotência**: advisory lock + check `processed=false` garante zero duplicação

