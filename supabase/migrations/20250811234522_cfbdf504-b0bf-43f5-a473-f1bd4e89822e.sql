-- Fix RLS policy for job_responses to allow anonymous insertions
DROP POLICY IF EXISTS "Anyone can create job responses" ON public.job_responses;

CREATE POLICY "Allow anonymous job responses creation" 
ON public.job_responses 
FOR INSERT 
WITH CHECK (true);

-- Ensure the policy allows viewing for admins
DROP POLICY IF EXISTS "Admins can view all job responses" ON public.job_responses;

CREATE POLICY "Admins can view all job responses" 
ON public.job_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);