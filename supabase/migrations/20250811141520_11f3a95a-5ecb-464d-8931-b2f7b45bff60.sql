-- Create job surveys table for job application forms
CREATE TABLE public.job_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  position_title TEXT NOT NULL,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job responses table for applicant responses
CREATE TABLE public.job_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_surveys
CREATE POLICY "Anyone can view active job surveys" 
ON public.job_surveys 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage job surveys" 
ON public.job_surveys 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for job_responses
CREATE POLICY "Anyone can create job responses" 
ON public.job_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all job responses" 
ON public.job_responses 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add trigger for automatic timestamp updates on job_surveys
CREATE TRIGGER update_job_surveys_updated_at
BEFORE UPDATE ON public.job_surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();