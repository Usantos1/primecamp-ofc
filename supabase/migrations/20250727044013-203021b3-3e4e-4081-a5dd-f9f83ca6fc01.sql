-- Habilitar realtime para a tabela tasks
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Habilitar realtime para a tabela calendar_events  
ALTER TABLE calendar_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;