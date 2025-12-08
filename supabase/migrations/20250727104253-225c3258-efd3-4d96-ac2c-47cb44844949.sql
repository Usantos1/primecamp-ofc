-- Habilitar realtime para a tabela time_clock
ALTER TABLE public.time_clock REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_clock;