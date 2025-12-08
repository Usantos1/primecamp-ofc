-- Criar tabelas para sistema de NPS de funcionários
CREATE TABLE public.employee_nps_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para respostas de avaliação de funcionários
CREATE TABLE public.employee_nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL,
  user_id UUID NOT NULL, -- Quem está avaliando
  target_employee_id UUID NOT NULL, -- Funcionário sendo avaliado  
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(survey_id, user_id, target_employee_id, date)
);

-- Enable RLS
ALTER TABLE public.employee_nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_nps_responses ENABLE ROW LEVEL SECURITY;

-- Policies para employee_nps_surveys
CREATE POLICY "Only admins can manage employee NPS surveys" 
ON public.employee_nps_surveys 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can view active employee NPS surveys" 
ON public.employee_nps_surveys 
FOR SELECT 
USING (is_active = true);

-- Policies para employee_nps_responses
CREATE POLICY "Users can create employee NPS responses" 
ON public.employee_nps_responses 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own responses on same day" 
ON public.employee_nps_responses 
FOR UPDATE 
USING (user_id = auth.uid() AND date = CURRENT_DATE);

CREATE POLICY "Users can view responses they made or about them or admins can view all" 
ON public.employee_nps_responses 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  target_employee_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_employee_nps_surveys_updated_at
BEFORE UPDATE ON public.employee_nps_surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();