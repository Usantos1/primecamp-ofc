-- Add new fields to trainings table
ALTER TABLE public.trainings 
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Create training_modules table
CREATE TABLE IF NOT EXISTS public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create training_lessons table
CREATE TABLE IF NOT EXISTS public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  duration_minutes integer,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create lesson_progress table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  progress real NOT NULL DEFAULT 0,
  last_watched_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_modules
CREATE POLICY "Anyone can view modules"
ON public.training_modules FOR SELECT
USING (true);

CREATE POLICY "Only admins manage modules"
ON public.training_modules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for training_lessons
CREATE POLICY "Anyone can view lessons"
ON public.training_lessons FOR SELECT
USING (true);

CREATE POLICY "Only admins manage lessons"
ON public.training_lessons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for lesson_progress
CREATE POLICY "Users view own progress or admins view all"
ON public.lesson_progress FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own progress"
ON public.lesson_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own progress"
ON public.lesson_progress FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins delete progress"
ON public.lesson_progress FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_training_modules_training ON public.training_modules(training_id);
CREATE INDEX IF NOT EXISTS idx_training_lessons_module ON public.training_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

-- Create trigger for updated_at
CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON public.training_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_lessons_updated_at
  BEFORE UPDATE ON public.training_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();