-- ============================================
-- FUNÇÃO PARA ATUALIZAR CRON JOB DE ANIVERSÁRIOS
-- ============================================

-- Função que atualiza o cron job baseado no horário fornecido (em formato HH:MM BRT)
CREATE OR REPLACE FUNCTION public.atualizar_cron_aniversario(horario_brt TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  horario_parts TEXT[];
  hora_brt INT;
  minuto_brt INT;
  hora_utc INT;
  minuto_utc INT;
  cron_schedule TEXT;
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZ3hpY2phcXBxYmhzZnp1dGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzE2OTksImV4cCI6MjA2ODk0NzY5OX0.2VcH8dJ3qHyuoVihv_484KJgPvnJD1aJvkCDLbK_gCY';
BEGIN
  -- Parse do horário (formato HH:MM)
  horario_parts := string_to_array(horario_brt, ':');
  hora_brt := horario_parts[1]::INT;
  minuto_brt := horario_parts[2]::INT;
  
  -- Converter BRT para UTC (BRT = UTC-3)
  hora_utc := hora_brt + 3;
  minuto_utc := minuto_brt;
  
  -- Formatar cron schedule (minuto hora * * *)
  cron_schedule := minuto_utc || ' ' || hora_utc || ' * * *';
  
  -- Remover cron job existente
  PERFORM cron.unschedule('send-birthday-messages');
  
  -- Criar novo cron job com o horário atualizado
  PERFORM cron.schedule(
    'send-birthday-messages',
    cron_schedule,
    format($$
      SELECT
        net.http_post(
          url := 'https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/send-birthday-messages',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb,
          body := '{"trigger": "cron"}'::jsonb
        ) as request_id;
    $$, anon_key)
  );
  
  RETURN format('Cron job atualizado para %s BRT (%s UTC) - Schedule: %s', 
    horario_brt, 
    format('%02d:%02d', hora_utc, minuto_utc),
    cron_schedule
  );
END;
$$;

-- Permitir que usuários autenticados executem a função
GRANT EXECUTE ON FUNCTION public.atualizar_cron_aniversario(TEXT) TO authenticated;

COMMENT ON FUNCTION public.atualizar_cron_aniversario IS 'Atualiza o cron job de mensagens de aniversário com o horário fornecido (em formato HH:MM BRT)';


