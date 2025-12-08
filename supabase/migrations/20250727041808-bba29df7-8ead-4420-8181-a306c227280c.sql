-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to send daily NPS reminders at 07:59 AM
SELECT cron.schedule(
  'daily-nps-reminder',
  '59 7 * * *', -- Every day at 07:59 AM
  $$
  SELECT
    net.http_post(
        url:='https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/daily-nps-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZ3hpY2phcXBxYmhzZnp1dGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzE2OTksImV4cCI6MjA2ODk0NzY5OX0.2VcH8dJ3qHyuoVihv_484KJgPvnJD1aJvkCDLbK_gCY"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);