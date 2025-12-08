-- Add slug field to job_surveys table
ALTER TABLE public.job_surveys 
ADD COLUMN slug text;

-- Create unique index for slug
CREATE UNIQUE INDEX idx_job_surveys_slug ON public.job_surveys(slug);

-- Update existing surveys with default slugs
UPDATE public.job_surveys 
SET slug = LOWER(REPLACE(REPLACE(position_title, ' ', '-'), 'ã', 'a'))
WHERE slug IS NULL;