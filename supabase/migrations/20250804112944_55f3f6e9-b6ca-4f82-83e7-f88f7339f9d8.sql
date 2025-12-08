-- Remover cron jobs existentes do NPS
SELECT cron.unschedule('daily-nps-reminder');
SELECT cron.unschedule('daily-nps-reminder-job');

-- Criar novo cron job para 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
  'daily-nps-reminder-8am',
  '0 11 * * *',
  $$
  select
    net.http_post(
        url:='https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/daily-nps-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZ3hpY2phcXBxYmhzZnp1dGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzE2OTksImV4cCI6MjA2ODk0NzY5OX0.2VcH8dJ3qHyuoVihv_484KJgPvnJD1aJvkCDLbK_gCY"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);