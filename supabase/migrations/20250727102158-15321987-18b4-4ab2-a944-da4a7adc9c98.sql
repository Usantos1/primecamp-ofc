-- Atualizar políticas RLS da tabela time_clock para permitir acesso público
-- Remover políticas existentes e criar novas

-- Remover políticas existentes de view para time_clock
DROP POLICY IF EXISTS "Users can view their own time records or admins can view all" ON public.time_clock;

-- Criar nova política permitindo que todos os usuários autenticados vejam todos os registros
CREATE POLICY "Authenticated users can view all time records" 
ON public.time_clock 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Permitir que usuários autenticados vejam também os registros de outros usuários para relatórios
CREATE POLICY "Authenticated users can view time records for reports" 
ON public.time_clock 
FOR SELECT 
USING (true);