-- Criar tabela de logs de atividades dos usuários
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'create', 'update', 'delete', 'view'
  description TEXT NOT NULL,
  entity_type TEXT, -- 'task', 'process', 'event', 'user', etc.
  entity_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de metas
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'count', -- 'count', 'hours', 'percentage', etc.
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
  category TEXT, -- 'productivity', 'sales', 'quality', etc.
  department TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de ponto eletrônico
CREATE TABLE public.time_clock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_hours INTERVAL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  notes TEXT,
  location TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para user_activity_logs
CREATE POLICY "Users can view their own logs or admins can view all"
ON public.user_activity_logs
FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "System can insert activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (true);

-- Habilitar RLS para goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Políticas para goals
CREATE POLICY "Users can view their own goals or department goals or admins can view all"
ON public.goals
FOR SELECT
USING (
  user_id = auth.uid() OR 
  department = (SELECT department FROM profiles WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create goals for themselves or admins can create for anyone"
ON public.goals
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can update their own goals or admins can update any"
ON public.goals
FOR UPDATE
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can delete their own goals or admins can delete any"
ON public.goals
FOR DELETE
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Habilitar RLS para time_clock
ALTER TABLE public.time_clock ENABLE ROW LEVEL SECURITY;

-- Políticas para time_clock
CREATE POLICY "Users can view their own time records or admins can view all"
ON public.time_clock
FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can insert their own time records"
ON public.time_clock
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time records or admins can update any"
ON public.time_clock
FOR UPDATE
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Criar função para registrar atividades automaticamente
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id, 
    activity_type, 
    description, 
    entity_type, 
    entity_id
  ) VALUES (
    p_user_id, 
    p_activity_type, 
    p_description, 
    p_entity_type, 
    p_entity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at em goals
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em time_clock
CREATE TRIGGER update_time_clock_updated_at
BEFORE UPDATE ON public.time_clock
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();