-- Corrigir política de UPDATE da tabela time_clock para permitir
-- que usuários atualizem seus próprios registros do dia atual

DROP POLICY IF EXISTS "Only admins update time records" ON public.time_clock;

CREATE POLICY "Users can update own today record or admins update all" 
ON public.time_clock
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  (user_id = auth.uid() AND date = CURRENT_DATE)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  (user_id = auth.uid() AND date = CURRENT_DATE)
);