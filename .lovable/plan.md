

# Plano: Ativar Passive Learning + Cron Job

## O que fazer

### 1. Ativar a flag `ai_passive_learning_enabled`

Inserir/atualizar na tabela `system_configurations`:
```sql
INSERT INTO public.system_configurations (key, value)
VALUES ('ai_passive_learning_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';
```

### 2. Criar cron job horário para `passive-learning-cron`

Usando `pg_cron` + `pg_net` para invocar a edge function a cada hora:
```sql
SELECT cron.schedule(
  'passive-learning-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://zaeozfdjhrmblfaxsyuu.supabase.co/functions/v1/passive-learning-cron',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZW96ZmRqaHJtYmxmYXhzeXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzcxODIsImV4cCI6MjA3OTQ1MzE4Mn0.lowOKwfcgxuGQPcWPEEw6TeCfXMR9h9EQRLAAs4mmZ0"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Verificar estado final

Confirmar que as configs estão corretas com SELECT.

## Resultado

- Passive learning ativado — conversas fechadas com CSAT ≥ 4 alimentam a KB automaticamente
- Cron roda a cada hora, processando até 20 conversas por ciclo
- Guard-rails existentes (learned_at, kill switch, shadow mode) continuam ativos

