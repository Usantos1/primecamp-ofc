-- Adicionar campos para controle de aprovação de usuários
ALTER TABLE public.profiles 
ADD COLUMN approved BOOLEAN DEFAULT FALSE,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- Aprovar o admin existente automaticamente
UPDATE public.profiles 
SET approved = TRUE, approved_at = NOW()
WHERE user_id = '4af9eb68-e1e1-49d9-b7bb-21312fc09ea6';

-- Atualizar função para verificar se usuário está aprovado
CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(approved, FALSE) FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Atualizar RLS policy para processos - apenas usuários aprovados
DROP POLICY IF EXISTS "Users can view accessible processes" ON public.processes;
CREATE POLICY "Approved users can view accessible processes" 
ON public.processes 
FOR SELECT 
USING (
  public.is_user_approved() AND 
  public.can_access_process(id)
);

-- RLS policies para gerenciar aprovação de profiles
CREATE POLICY "Admins can view all profiles for approval" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update profile approval" 
ON public.profiles 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

-- Usuários não aprovados só podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);