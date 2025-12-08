-- Corrigir políticas RLS para permitir candidaturas anônimas
-- Primeiro, remover a política atual que pode estar com problemas
DROP POLICY IF EXISTS "Allow anonymous job responses creation" ON public.job_responses;

-- Criar nova política que permite inserção anônima de candidaturas
CREATE POLICY "Anyone can submit job applications" 
ON public.job_responses 
FOR INSERT 
WITH CHECK (true);

-- Verificar se RLS está habilitado
ALTER TABLE public.job_responses ENABLE ROW LEVEL SECURITY;