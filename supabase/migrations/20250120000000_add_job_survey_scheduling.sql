-- Add scheduling fields to job_surveys table
ALTER TABLE public.job_surveys 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_job_surveys_published_at ON public.job_surveys(published_at);
CREATE INDEX IF NOT EXISTS idx_job_surveys_expires_at ON public.job_surveys(expires_at);

-- Create function to automatically update is_active based on published_at and expires_at
CREATE OR REPLACE FUNCTION update_job_survey_active_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If published_at is set and in the future, set is_active to false
  IF NEW.published_at IS NOT NULL AND NEW.published_at > NOW() THEN
    NEW.is_active = false;
  END IF;
  
  -- If expires_at is set and in the past, set is_active to false
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() THEN
    NEW.is_active = false;
  END IF;
  
  -- If published_at is in the past and expires_at is null or in the future, set is_active to true
  IF (NEW.published_at IS NULL OR NEW.published_at <= NOW()) 
     AND (NEW.expires_at IS NULL OR NEW.expires_at >= NOW()) THEN
    -- Only set to true if user hasn't manually set it to false
    IF NEW.is_active IS NULL OR NEW.is_active = true THEN
      NEW.is_active = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status
DROP TRIGGER IF EXISTS trigger_update_job_survey_active_status ON public.job_surveys;
CREATE TRIGGER trigger_update_job_survey_active_status
BEFORE INSERT OR UPDATE ON public.job_surveys
FOR EACH ROW
EXECUTE FUNCTION update_job_survey_active_status();

-- Create table for tracking job survey views (for analytics)
CREATE TABLE IF NOT EXISTS public.job_survey_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.job_surveys(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_job_survey_views_survey_id ON public.job_survey_views(survey_id);
CREATE INDEX IF NOT EXISTS idx_job_survey_views_viewed_at ON public.job_survey_views(viewed_at);

-- Enable RLS
ALTER TABLE public.job_survey_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert views (for tracking)
CREATE POLICY "Anyone can insert job survey views"
ON public.job_survey_views
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view job survey views"
ON public.job_survey_views
FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

