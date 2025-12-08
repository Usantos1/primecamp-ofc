-- Enable RLS on job_responses table to fix security warning
ALTER TABLE public.job_responses ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies for job_responses
-- Allow anyone to insert (for public job applications)
CREATE POLICY "Anyone can submit job responses" 
ON public.job_responses 
FOR INSERT 
WITH CHECK (true);

-- Allow admins to view all responses
CREATE POLICY "Admins can view all job responses" 
ON public.job_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Allow admins to manage responses
CREATE POLICY "Admins can manage job responses" 
ON public.job_responses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

COMMENT ON TABLE public.job_responses IS 'Job application responses with proper RLS policies.';