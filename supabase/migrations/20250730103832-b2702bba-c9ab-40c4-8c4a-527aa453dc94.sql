-- Configure cron job for daily NPS reminders at 9 AM
-- Enable required extensions
SELECT cron.schedule(
  'daily-nps-reminder-job',
  '0 9 * * *', -- Every day at 9 AM
  $$
  SELECT
    net.http_post(
        url:='https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/daily-nps-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZ3hpY2phcXBxYmhzZnp1dGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzE2OTksImV4cCI6MjA2ODk0NzY5OX0.2VcH8dJ3qHyuoVihv_484KJgPvnJD1aJvkCDLbK_gCY"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);