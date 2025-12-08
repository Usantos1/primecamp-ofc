-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  process_id UUID REFERENCES public.processes(id),
  responsible_user_id UUID NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'canceled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Users can view accessible tasks" 
ON public.tasks 
FOR SELECT 
USING (
  -- Admin can see all tasks
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
  OR 
  -- Users can see tasks assigned to them
  (responsible_user_id = auth.uid())
  OR
  -- Users can see tasks in processes they can access
  (EXISTS (SELECT 1 FROM public.processes WHERE id = process_id AND can_access_process(id)))
);

CREATE POLICY "Admins can insert tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can update their assigned tasks or admins can update all" 
ON public.tasks 
FOR UPDATE 
USING (
  (responsible_user_id = auth.uid()) 
  OR 
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

CREATE POLICY "Admins can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically mark overdue tasks
CREATE OR REPLACE FUNCTION public.update_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tasks 
  SET status = 'delayed'
  WHERE deadline < now() 
  AND status IN ('pending', 'in_progress');
END;
$$;