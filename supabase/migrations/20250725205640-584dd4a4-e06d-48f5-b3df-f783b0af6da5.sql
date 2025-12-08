-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Create policies for department access
CREATE POLICY "Anyone can view departments" 
ON public.departments 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert departments" 
ON public.departments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Only admins can update departments" 
ON public.departments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Only admins can delete departments" 
ON public.departments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create team_permissions table for managing team-based functionalities
CREATE TABLE public.team_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_name TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_name, permission_key)
);

-- Enable Row Level Security
ALTER TABLE public.team_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for team permissions
CREATE POLICY "Anyone can view team permissions" 
ON public.team_permissions 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage team permissions" 
ON public.team_permissions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for team permissions
CREATE TRIGGER update_team_permissions_updated_at
BEFORE UPDATE ON public.team_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();