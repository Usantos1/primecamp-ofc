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
CREATE POLICY "Admins can view AI analysis"
ON public.job_candidate_ai_analysis
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- System can insert/update (via edge function)
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

CREATE TRIGGER trigger_update_job_candidate_ai_analysis_updated_at
BEFORE UPDATE ON public.job_candidate_ai_analysis
FOR EACH ROW
EXECUTE FUNCTION update_job_candidate_ai_analysis_updated_at();

