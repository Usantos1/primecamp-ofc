-- Add DELETE policy for time_clock table to allow admins to delete records
CREATE POLICY "Admins can delete time records" 
ON public.time_clock 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);