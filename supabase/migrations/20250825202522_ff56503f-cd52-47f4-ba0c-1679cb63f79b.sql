-- Create job_candidate_evaluations table for managing candidate status, ratings and notes
CREATE TABLE public.job_candidate_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_response_id UUID NOT NULL REFERENCES public.job_responses(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'qualified', 'interview', 'approved', 'rejected')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_response_id, evaluator_id)
);

-- Enable RLS
ALTER TABLE public.job_candidate_evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can manage candidate evaluations" 
ON public.job_candidate_evaluations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for updated_at
CREATE TRIGGER update_job_candidate_evaluations_updated_at
BEFORE UPDATE ON public.job_candidate_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();