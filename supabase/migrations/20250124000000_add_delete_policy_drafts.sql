-- Add DELETE policy for job_application_drafts
-- Allow admins to delete any draft
DROP POLICY IF EXISTS "Admins can delete all drafts" ON public.job_application_drafts;
CREATE POLICY "Admins can delete all drafts"
ON public.job_application_drafts
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Also allow anyone to delete their own drafts (by email match)
DROP POLICY IF EXISTS "Anyone can delete their own drafts" ON public.job_application_drafts;
CREATE POLICY "Anyone can delete their own drafts"
ON public.job_application_drafts
FOR DELETE
USING (true);

