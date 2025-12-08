-- Add CEP column to job_responses table
ALTER TABLE public.job_responses 
ADD COLUMN IF NOT EXISTS cep text;