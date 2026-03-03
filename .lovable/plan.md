

# Diagnóstico: Conversa #F0B2DC27 — IA não respondeu

Analisei o projeto atual e sigo as regras da base de conhecimento.

## O que aconteceu (passo a passo)

```text
22:30:11 - "Boa noite" → Master Flow → welcome_ia → enviou saudação ✅
22:30:35 - "Quero falar sobre meu pedido" → Flow transicionou para ai_response(ia_entrada) ✅
22:30:37 - Webhook BUFFEROU a mensagem (buffer ID: 0f95f99c) com delay de 8s ✅
         → Esperando cron "process-buffered-messages" processar...
         → ❌ CRON NUNCA EXECUTOU → mensagem ficou parada para sempre
```

## Causa Raiz

O `process-buffered-messages` está configurado no `config.toml` (linha 412-414), mas **o cron job NÃO existe no banco de dados**. Existem apenas 4 cron jobs ativos:

| Job | Status |
|---|---|
| dispatch-conversations | ✅ Ativo |
| process-playbook-queue | ✅ Ativo |
| auto-close-conversations | ✅ Ativo |
| process-pending-deal-closures | ✅ Ativo |
| **process-buffered-messages** | **❌ NÃO EXISTE** |

**Resultado**: 78 mensagens estão presas no buffer sem processar. Toda conversa que chega no nó `ai_response` fica muda.

## Correção

Criar o cron job no banco de dados via migration SQL:

```sql
SELECT cron.schedule(
  'process-buffered-messages-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zaeozfdjhrmblfaxsyuu.supabase.co/functions/v1/process-buffered-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZW96ZmRqaHJtYmxmYXhzeXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzcxODIsImV4cCI6MjA3OTQ1MzE4Mn0.lowOKwfcgxuGQPcWPEEw6TeCfXMR9h9EQRLAAs4mmZ0"}'::jsonb,
    body := jsonb_build_object('time', now())
  ) as request_id;
  $$
);
```

Isso faz o cron rodar a cada minuto, processando as mensagens bufferizadas e gerando as respostas da IA.

## Impacto

- **Zero regressão**: apenas adiciona o cron que faltava
- **78 mensagens pendentes** serão processadas no próximo ciclo
- **Todas as conversas futuras** no nó `ai_response` receberão resposta normalmente
- As alterações anteriores (routing, reopen) estão **100% corretas** — o problema era infraestrutura

