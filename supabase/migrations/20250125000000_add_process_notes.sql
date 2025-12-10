-- Adicionar coluna para anotações/sugestões de colaboradores
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Comentário na coluna
COMMENT ON COLUMN public.processes.notes IS 'Anotações e sugestões de mudanças no processo feitas por colaboradores (formato HTML)';


