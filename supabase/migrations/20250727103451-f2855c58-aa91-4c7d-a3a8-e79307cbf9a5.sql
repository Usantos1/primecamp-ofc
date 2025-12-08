-- Limpar políticas duplicadas do time_clock
DROP POLICY IF EXISTS "Authenticated users can view time records for reports" ON public.time_clock;

-- Manter apenas uma política simples para view
-- A política "Authenticated users can view all time records" já permite acesso a todos os usuários autenticados