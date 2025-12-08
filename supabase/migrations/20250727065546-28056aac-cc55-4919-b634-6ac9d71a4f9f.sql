-- Enable realtime for processes table
ALTER TABLE public.processes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.processes;