-- Ajustar cron job do NPS para 07:59 BRT (10:59 UTC)
-- Primeiro, remover o cron job existente se houver
SELECT cron.unschedule('daily-nps-reminder');

-- Criar novo cron job com horário correto para 07:59 BRT (10:59 UTC)
SELECT cron.schedule(
  'daily-nps-reminder',
  '59 10 * * *', -- 10:59 UTC = 07:59 BRT (considerando UTC-3)
  $$
  select
    net.http_post(
        url:='https://b79bb2fa-09d3-4f84-bc0f-b939048d95f3.lovableproject.com/functions/v1/daily-nps-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImI3OWJiMmZhMDlkMzRmODRiYzBmYjkzOTA0OGQ5NWYzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDkwMjUsImV4cCI6MjA1MTA4NTAyNX0.RxqtBHSgJqjr0WMJq9xDnlSrb-yHqNzB6Gj2IgpJFRw"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);