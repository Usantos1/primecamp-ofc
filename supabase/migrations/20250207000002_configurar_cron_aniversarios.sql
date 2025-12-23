-- ============================================
-- CONFIGURAR CRON JOB PARA ENVIO DE MENSAGENS DE ANIVERSÁRIO
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover cron job existente se houver (para evitar duplicatas)
SELECT cron.unschedule('send-birthday-messages') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-birthday-messages'
);

-- Criar cron job para chamar a função de aniversários às 09:00 BRT (12:00 UTC)
-- Nota: Ajuste o horário UTC conforme necessário (BRT = UTC-3)
SELECT cron.schedule(
  'send-birthday-messages',
  '0 12 * * *', -- 12:00 UTC = 09:00 BRT (UTC-3)
  $$
  SELECT
    net.http_post(
      url := 'https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/send-birthday-messages',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZ3hpY2phcXBxYmhzZnp1dGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzE2OTksImV4cCI6MjA2ODk0NzY5OX0.2VcH8dJ3qHyuoVihv_484KJgPvnJD1aJvkCDLbK_gCY"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Extensão para agendamento de tarefas (cron jobs)';
COMMENT ON EXTENSION pg_net IS 'Extensão para requisições HTTP a partir do PostgreSQL';


