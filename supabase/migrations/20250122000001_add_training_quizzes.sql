-- Create training_quizzes table
CREATE TABLE IF NOT EXISTS public.training_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score real NOT NULL DEFAULT 70.0, -- Minimum score to pass (percentage)
  max_attempts integer, -- NULL means unlimited attempts
  time_limit_minutes integer, -- NULL means no time limit
  randomize_questions boolean NOT NULL DEFAULT false,
  show_correct_answers boolean NOT NULL DEFAULT true,
  required boolean NOT NULL DEFAULT true, -- Required to complete training
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer
  order_index integer NOT NULL DEFAULT 0,
  points real NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_question_options table (for multiple choice and true/false)
CREATE TABLE IF NOT EXISTS public.quiz_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score real NOT NULL,
  passed boolean NOT NULL,
  time_spent_seconds integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_attempt_answers table
CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.quiz_question_options(id),
  answer_text text, -- For short answer questions
  is_correct boolean NOT NULL,
  points_earned real NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_training_quizzes_training ON public.training_quizzes(training_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_options_question ON public.quiz_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user ON public.quiz_attempts(quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt ON public.quiz_attempt_answers(attempt_id);

-- Enable RLS
ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_quizzes
CREATE POLICY "Anyone can view quizzes"
ON public.training_quizzes FOR SELECT
USING (true);

CREATE POLICY "Only admins manage quizzes"
ON public.training_quizzes FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz_questions
CREATE POLICY "Anyone can view questions"
ON public.quiz_questions FOR SELECT
USING (true);

CREATE POLICY "Only admins manage questions"
ON public.quiz_questions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz_question_options
CREATE POLICY "Anyone can view question options"
ON public.quiz_question_options FOR SELECT
USING (true);

CREATE POLICY "Only admins manage question options"
ON public.quiz_question_options FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can view own attempts or admins view all"
ON public.quiz_attempts FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attempts"
ON public.quiz_attempts FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for quiz_attempt_answers
CREATE POLICY "Users can view own attempt answers or admins view all"
ON public.quiz_attempt_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts 
    WHERE quiz_attempts.id = quiz_attempt_answers.attempt_id 
    AND (quiz_attempts.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can insert own attempt answers"
ON public.quiz_attempt_answers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts 
    WHERE quiz_attempts.id = quiz_attempt_answers.attempt_id 
    AND quiz_attempts.user_id = auth.uid()
  )
);

-- Triggers
CREATE TRIGGER set_updated_at_training_quizzes
  BEFORE UPDATE ON public.training_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_quiz_questions
  BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

