-- Add new fields to job_responses table for contact information
ALTER TABLE public.job_responses 
ADD COLUMN address TEXT,
ADD COLUMN whatsapp TEXT,
ADD COLUMN instagram TEXT,
ADD COLUMN linkedin TEXT;

-- Add comprehensive job information fields to job_surveys table
ALTER TABLE public.job_surveys 
ADD COLUMN salary_range TEXT,
ADD COLUMN contract_type TEXT DEFAULT 'full-time',
ADD COLUMN location TEXT,
ADD COLUMN benefits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN requirements JSONB DEFAULT '[]'::jsonb,
ADD COLUMN company_logo TEXT,
ADD COLUMN company_name TEXT;

-- Add indexes for better performance
CREATE INDEX idx_job_responses_whatsapp ON public.job_responses(whatsapp);
CREATE INDEX idx_job_surveys_location ON public.job_surveys(location);
CREATE INDEX idx_job_surveys_contract_type ON public.job_surveys(contract_type);