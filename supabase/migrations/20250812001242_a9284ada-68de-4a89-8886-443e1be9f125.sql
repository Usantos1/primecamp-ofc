-- Desabilitar RLS completamente na tabela job_responses para permitir inserções anônimas
ALTER TABLE public.job_responses DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Anyone can submit job applications" ON public.job_responses;
DROP POLICY IF EXISTS "Admins can view all job responses" ON public.job_responses;
DROP POLICY IF EXISTS "Allow anonymous job responses creation" ON public.job_responses;