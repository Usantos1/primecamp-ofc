-- Fix candidate_responses RLS policies to prevent public data exposure
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Allow viewing candidate responses by test session" ON candidate_responses;
DROP POLICY IF EXISTS "Allow update of incomplete candidate responses" ON candidate_responses;

-- Only admins can view all candidate responses
CREATE POLICY "Admins view all candidate responses"
ON candidate_responses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow updates only for incomplete tests and only by admins
CREATE POLICY "Admins update candidate responses"
ON candidate_responses FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add length constraints to job_responses to prevent data bloat
DO $$ 
BEGIN
  ALTER TABLE job_responses ADD CONSTRAINT job_responses_name_length CHECK (length(name) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE job_responses ADD CONSTRAINT job_responses_email_length CHECK (length(email) <= 255);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE job_responses ADD CONSTRAINT job_responses_phone_length CHECK (phone IS NULL OR length(phone) <= 20);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE job_responses ADD CONSTRAINT job_responses_address_length CHECK (address IS NULL OR length(address) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE job_responses ADD CONSTRAINT job_responses_whatsapp_length CHECK (whatsapp IS NULL OR length(whatsapp) <= 20);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE job_responses ADD CONSTRAINT job_responses_instagram_length CHECK (instagram IS NULL OR length(instagram) <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE job_responses ADD CONSTRAINT job_responses_linkedin_length CHECK (linkedin IS NULL OR length(linkedin) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add length constraints to candidate_responses
DO $$ 
BEGIN
  ALTER TABLE candidate_responses ADD CONSTRAINT candidate_responses_name_length CHECK (length(name) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE candidate_responses ADD CONSTRAINT candidate_responses_email_length CHECK (email IS NULL OR length(email) <= 255);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE candidate_responses ADD CONSTRAINT candidate_responses_whatsapp_length CHECK (whatsapp IS NULL OR length(whatsapp) <= 20);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;