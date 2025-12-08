-- Add participants field to goals table
ALTER TABLE public.goals 
ADD COLUMN participants uuid[] DEFAULT '{}';

-- Update RLS policy for goals to include participants
DROP POLICY IF EXISTS "Users can view their own goals or department goals or admins ca" ON public.goals;

CREATE POLICY "Users can view their goals, department goals, participant goals or admins can view all" 
ON public.goals 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  (department = (SELECT department FROM profiles WHERE user_id = auth.uid())) OR
  (auth.uid() = ANY(participants)) OR
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- Update other policies to include participants
DROP POLICY IF EXISTS "Users can update their own goals or admins can update any" ON public.goals;

CREATE POLICY "Users can update their goals, participant goals or admins can update any" 
ON public.goals 
FOR UPDATE 
USING (
  (user_id = auth.uid()) OR 
  (auth.uid() = ANY(participants)) OR
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
);