-- Adicionar campo de departamento na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN department TEXT;

-- Atualizar perfil existente do admin com departamento
UPDATE public.profiles 
SET department = 'administrativo' 
WHERE user_id = '4af9eb68-e1e1-49d9-b7bb-21312fc09ea6';

-- Criar função security definer para obter departamento do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_department()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT department FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Criar função security definer para verificar se usuário pode acessar processo
CREATE OR REPLACE FUNCTION public.can_access_process(_process_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT EXISTS (
    -- Admin pode ver todos os processos
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    -- Usuário pode ver processos onde é participante ou proprietário
    SELECT 1 FROM public.processes p
    WHERE p.id = _process_id 
    AND (
      p.owner = (SELECT display_name FROM public.profiles WHERE user_id = auth.uid())
      OR auth.uid()::text = ANY(p.participants)
      OR (SELECT display_name FROM public.profiles WHERE user_id = auth.uid()) = ANY(p.participants)
    )
  ) OR EXISTS (
    -- Usuário pode ver processos do mesmo departamento
    SELECT 1 FROM public.processes p
    WHERE p.id = _process_id 
    AND p.department = (SELECT department FROM public.profiles WHERE user_id = auth.uid())
  );
$$;

-- Atualizar RLS policy para processos
DROP POLICY IF EXISTS "Anyone can view processes" ON public.processes;
CREATE POLICY "Users can view accessible processes" 
ON public.processes 
FOR SELECT 
USING (public.can_access_process(id));