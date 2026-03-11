-- Remove existing cron job with anon key
SELECT cron.unschedule('passive-learning-hourly');

-- Recreate with service_role_key via current_setting
SELECT cron.schedule(
  'passive-learning-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zaeozfdjhrmblfaxsyuu.supabase.co/functions/v1/passive-learning-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);