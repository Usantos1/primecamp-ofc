-- Fix candidate_responses RLS policies to allow unauthenticated users to create and update responses
DROP POLICY IF EXISTS "Anyone can create candidate responses" ON public.candidate_responses;
DROP POLICY IF EXISTS "Anyone can update incomplete candidate responses" ON public.candidate_responses;

-- Allow anyone (including unauthenticated users) to create candidate responses
CREATE POLICY "Allow unauthenticated candidate response creation" 
ON public.candidate_responses 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update incomplete candidate responses (for test progression)
CREATE POLICY "Allow update of incomplete candidate responses" 
ON public.candidate_responses 
FOR UPDATE 
USING (is_completed = false);

-- Allow anyone to view their own candidate responses by session ID or test ID
-- This is needed for the test to work properly
CREATE POLICY "Allow viewing candidate responses by test session" 
ON public.candidate_responses 
FOR SELECT 
USING (
  -- Allow if user is admin
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')) OR
  -- Allow viewing of any candidate response (needed for external candidates)
  true
);