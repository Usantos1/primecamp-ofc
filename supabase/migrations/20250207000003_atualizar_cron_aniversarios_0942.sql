-- ============================================
-- ATUALIZAR CRON JOB PARA 09:42 BRT (12:42 UTC)
-- ============================================

-- Remover cron job existente
SELECT cron.unschedule('send-birthday-messages');

-- Criar novo cron job para 09:42 BRT (12:42 UTC)
SELECT cron.schedule(
  'send-birthday-messages',
  '42 12 * * *', -- 12:42 UTC = 09:42 BRT (UTC-3)
  $$
  SELECT
    net.http_post(
      url := 'https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/send-birthday-messages',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZ3hpY2phcXBxYmhzZnp1dGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzE2OTksImV4cCI6MjA2ODk0NzY5OX0.2VcH8dJ3qHyuoVihv_484KJgPvnJD1aJvkCDLbK_gCY"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);


