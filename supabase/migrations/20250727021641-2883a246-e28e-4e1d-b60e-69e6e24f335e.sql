-- Create NPS surveys table
CREATE TABLE public.nps_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create NPS responses table
CREATE TABLE public.nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.nps_surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(survey_id, user_id, date)
);

-- Enable RLS
ALTER TABLE public.nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for nps_surveys
CREATE POLICY "Only admins can manage NPS surveys" 
ON public.nps_surveys 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can view active NPS surveys" 
ON public.nps_surveys 
FOR SELECT 
USING (is_active = true);

-- RLS policies for nps_responses
CREATE POLICY "Users can create their own NPS responses" 
ON public.nps_responses 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own responses or admins can view all" 
ON public.nps_responses 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can update their own responses on same day" 
ON public.nps_responses 
FOR UPDATE 
USING (user_id = auth.uid() AND date = CURRENT_DATE);

-- Add triggers for updated_at
CREATE TRIGGER update_nps_surveys_updated_at
  BEFORE UPDATE ON public.nps_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update time_clock table to support multiple break periods
ALTER TABLE public.time_clock 
  ADD COLUMN IF NOT EXISTS lunch_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lunch_end TIMESTAMP WITH TIME ZONE;