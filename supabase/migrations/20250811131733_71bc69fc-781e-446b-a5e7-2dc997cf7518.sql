-- Fix RLS policy for disc_responses to allow users to update their own incomplete responses
DROP POLICY IF EXISTS "Users can update their own incomplete responses" ON public.disc_responses;

CREATE POLICY "Users can update their own responses" 
ON public.disc_responses 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create table for external candidates
CREATE TABLE public.candidate_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  whatsapp TEXT,
  email TEXT,
  company TEXT DEFAULT 'Candidato Externo',
  test_id UUID NOT NULL,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  d_score INTEGER DEFAULT 0,
  i_score INTEGER DEFAULT 0,
  s_score INTEGER DEFAULT 0,
  c_score INTEGER DEFAULT 0,
  dominant_profile TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completion_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for candidate_responses
ALTER TABLE public.candidate_responses ENABLE ROW LEVEL SECURITY;

-- Allow public access to candidate_responses (for external candidates)
CREATE POLICY "Anyone can create candidate responses" 
ON public.candidate_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update incomplete candidate responses" 
ON public.candidate_responses 
FOR UPDATE 
USING (is_completed = false);

CREATE POLICY "Anyone can view candidate responses" 
ON public.candidate_responses 
FOR SELECT 
USING (true);

-- Admins can view all candidate responses
CREATE POLICY "Admins can manage all candidate responses" 
ON public.candidate_responses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Add trigger for updated_at
CREATE TRIGGER update_candidate_responses_updated_at
BEFORE UPDATE ON public.candidate_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();