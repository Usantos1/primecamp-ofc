-- ============================================
-- MIGRATION 1: Job Application Drafts Table
-- ============================================
-- Create table for saving partial job applications (drafts)
CREATE TABLE IF NOT EXISTS public.job_application_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.job_surveys(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  age INTEGER,
  cep TEXT,
  address TEXT,
  whatsapp TEXT,
  instagram TEXT,
  linkedin TEXT,
  responses JSONB DEFAULT '{}'::jsonb,
  current_step INTEGER DEFAULT 0,
  form_data JSONB DEFAULT '{}'::jsonb,
  last_saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(survey_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_application_drafts_survey_id ON public.job_application_drafts(survey_id);
CREATE INDEX IF NOT EXISTS idx_job_application_drafts_email ON public.job_application_drafts(email);
CREATE INDEX IF NOT EXISTS idx_job_application_drafts_last_saved ON public.job_application_drafts(last_saved_at);

-- Enable RLS
ALTER TABLE public.job_application_drafts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create/update their own drafts
DROP POLICY IF EXISTS "Anyone can create job application drafts" ON public.job_application_drafts;
CREATE POLICY "Anyone can create job application drafts"
ON public.job_application_drafts
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update their own drafts" ON public.job_application_drafts;
CREATE POLICY "Anyone can update their own drafts"
ON public.job_application_drafts
FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view their own drafts" ON public.job_application_drafts;
CREATE POLICY "Anyone can view their own drafts"
ON public.job_application_drafts
FOR SELECT
USING (true);

-- Admins can view all drafts
DROP POLICY IF EXISTS "Admins can view all drafts" ON public.job_application_drafts;
CREATE POLICY "Admins can view all drafts"
ON public.job_application_drafts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_job_application_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_saved_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_job_application_drafts_updated_at ON public.job_application_drafts;
CREATE TRIGGER trigger_update_job_application_drafts_updated_at
BEFORE UPDATE ON public.job_application_drafts
FOR EACH ROW
EXECUTE FUNCTION update_job_application_drafts_updated_at();

-- Function to clean old drafts (older than 30 days)
CREATE OR REPLACE FUNCTION clean_old_job_application_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.job_application_drafts
  WHERE last_saved_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION 2: AI Analysis Table
-- ============================================
-- Create table for AI analysis of candidates
CREATE TABLE IF NOT EXISTS public.job_candidate_ai_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_response_id UUID NOT NULL REFERENCES public.job_responses(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES public.job_surveys(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_response_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_candidate_ai_analysis_survey_id ON public.job_candidate_ai_analysis(survey_id);
CREATE INDEX IF NOT EXISTS idx_job_candidate_ai_analysis_response_id ON public.job_candidate_ai_analysis(job_response_id);
CREATE INDEX IF NOT EXISTS idx_job_candidate_ai_analysis_created_at ON public.job_candidate_ai_analysis(created_at);

-- Enable RLS
ALTER TABLE public.job_candidate_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Only admins can view AI analysis
DROP POLICY IF EXISTS "Admins can view AI analysis" ON public.job_candidate_ai_analysis;
CREATE POLICY "Admins can view AI analysis"
ON public.job_candidate_ai_analysis
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- System can insert/update (via edge function)
DROP POLICY IF EXISTS "System can manage AI analysis" ON public.job_candidate_ai_analysis;
CREATE POLICY "System can manage AI analysis"
ON public.job_candidate_ai_analysis
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_job_candidate_ai_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_job_candidate_ai_analysis_updated_at ON public.job_candidate_ai_analysis;
CREATE TRIGGER trigger_update_job_candidate_ai_analysis_updated_at
BEFORE UPDATE ON public.job_candidate_ai_analysis
FOR EACH ROW
EXECUTE FUNCTION update_job_candidate_ai_analysis_updated_at();

