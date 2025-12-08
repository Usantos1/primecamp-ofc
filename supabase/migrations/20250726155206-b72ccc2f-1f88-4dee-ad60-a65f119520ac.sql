-- Criar tabela para tags customizáveis
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6366f1',
  icon text DEFAULT '🏷️',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create policies for tags
CREATE POLICY "Anyone can view tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Only admins can update tags" 
ON public.tags 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Only admins can delete tags" 
ON public.tags 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Criar tabela para associar tags aos processos
CREATE TABLE public.process_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(process_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.process_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for process_tags
CREATE POLICY "Users can view process tags if they can access the process" 
ON public.process_tags 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM processes p 
  WHERE p.id = process_id AND can_access_process(p.id)
));

CREATE POLICY "Only admins can manage process tags" 
ON public.process_tags 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Trigger para updated_at nas tags
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para templates de processos
CREATE TABLE public.process_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL,
  category_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.process_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for process_templates
CREATE POLICY "Anyone can view process templates" 
ON public.process_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage process templates" 
ON public.process_templates 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Trigger para updated_at nos templates
CREATE TRIGGER update_process_templates_updated_at
BEFORE UPDATE ON public.process_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar colunas para checklist e comentários nas tarefas
ALTER TABLE public.tasks 
ADD COLUMN checklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN comments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Criar tabela para eventos de calendário
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  location text,
  event_type text NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'task', 'reminder', 'deadline')),
  related_task_id uuid,
  related_process_id uuid,
  attendees text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar_events
CREATE POLICY "Users can view events they created or are attendees" 
ON public.calendar_events 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  (SELECT display_name FROM profiles WHERE user_id = auth.uid()) = ANY(attendees) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can create their own events" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update events they created or admins can update all" 
ON public.calendar_events 
FOR UPDATE 
USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can delete events they created or admins can delete all" 
ON public.calendar_events 
FOR DELETE 
USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para updated_at nos eventos
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();