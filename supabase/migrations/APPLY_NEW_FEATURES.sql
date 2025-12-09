-- ============================================
-- MIGRATION: Lesson Bookmarks
-- ============================================
-- Create lesson_bookmarks table for video annotations
CREATE TABLE IF NOT EXISTS public.lesson_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time integer NOT NULL, -- Time in seconds
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, user_id, time)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lesson_bookmarks_lesson_user ON public.lesson_bookmarks(lesson_id, user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_bookmarks_user ON public.lesson_bookmarks(user_id);

-- Enable RLS
ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own bookmarks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lesson_bookmarks' 
    AND policyname = 'Users can view own bookmarks'
  ) THEN
    CREATE POLICY "Users can view own bookmarks"
    ON public.lesson_bookmarks
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can insert their own bookmarks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lesson_bookmarks' 
    AND policyname = 'Users can insert own bookmarks'
  ) THEN
    CREATE POLICY "Users can insert own bookmarks"
    ON public.lesson_bookmarks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can update their own bookmarks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lesson_bookmarks' 
    AND policyname = 'Users can update own bookmarks'
  ) THEN
    CREATE POLICY "Users can update own bookmarks"
    ON public.lesson_bookmarks
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can delete their own bookmarks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lesson_bookmarks' 
    AND policyname = 'Users can delete own bookmarks'
  ) THEN
    CREATE POLICY "Users can delete own bookmarks"
    ON public.lesson_bookmarks
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_updated_at_lesson_bookmarks ON public.lesson_bookmarks;
CREATE TRIGGER set_updated_at_lesson_bookmarks
  BEFORE UPDATE ON public.lesson_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- MIGRATION: Training Quizzes
-- ============================================
-- Create training_quizzes table
CREATE TABLE IF NOT EXISTS public.training_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score real NOT NULL DEFAULT 70.0,
  max_attempts integer,
  time_limit_minutes integer,
  randomize_questions boolean NOT NULL DEFAULT false,
  show_correct_answers boolean NOT NULL DEFAULT true,
  required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  order_index integer NOT NULL DEFAULT 0,
  points real NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_question_options table
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
  answer_text text,
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

-- RLS Policies (with IF NOT EXISTS check)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_quizzes' AND policyname = 'Anyone can view quizzes') THEN
    CREATE POLICY "Anyone can view quizzes" ON public.training_quizzes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_quizzes' AND policyname = 'Only admins manage quizzes') THEN
    CREATE POLICY "Only admins manage quizzes" ON public.training_quizzes FOR ALL USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Anyone can view questions') THEN
    CREATE POLICY "Anyone can view questions" ON public.quiz_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Only admins manage questions') THEN
    CREATE POLICY "Only admins manage questions" ON public.quiz_questions FOR ALL USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_question_options' AND policyname = 'Anyone can view question options') THEN
    CREATE POLICY "Anyone can view question options" ON public.quiz_question_options FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_question_options' AND policyname = 'Only admins manage question options') THEN
    CREATE POLICY "Only admins manage question options" ON public.quiz_question_options FOR ALL USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_attempts' AND policyname = 'Users can view own attempts or admins view all') THEN
    CREATE POLICY "Users can view own attempts or admins view all" ON public.quiz_attempts FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_attempts' AND policyname = 'Users can insert own attempts') THEN
    CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_attempts' AND policyname = 'Users can update own attempts') THEN
    CREATE POLICY "Users can update own attempts" ON public.quiz_attempts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_attempt_answers' AND policyname = 'Users can view own attempt answers or admins view all') THEN
    CREATE POLICY "Users can view own attempt answers or admins view all" ON public.quiz_attempt_answers FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = quiz_attempt_answers.attempt_id AND (quiz_attempts.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_attempt_answers' AND policyname = 'Users can insert own attempt answers') THEN
    CREATE POLICY "Users can insert own attempt answers" ON public.quiz_attempt_answers FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = quiz_attempt_answers.attempt_id AND quiz_attempts.user_id = auth.uid())
    );
  END IF;
END $$;

-- Triggers
DROP TRIGGER IF EXISTS set_updated_at_training_quizzes ON public.training_quizzes;
CREATE TRIGGER set_updated_at_training_quizzes
  BEFORE UPDATE ON public.training_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_quiz_questions ON public.quiz_questions;
CREATE TRIGGER set_updated_at_quiz_questions
  BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- MIGRATION: Gamification
-- ============================================
-- Create user_points table
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  source text NOT NULL,
  source_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source, source_id)
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_description text,
  badge_icon text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Create user_streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_points' AND policyname = 'Users can view own points or admins view all') THEN
    CREATE POLICY "Users can view own points or admins view all" ON public.user_points FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_points' AND policyname = 'System can insert points') THEN
    CREATE POLICY "System can insert points" ON public.user_points FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_badges' AND policyname = 'Users can view own badges or admins view all') THEN
    CREATE POLICY "Users can view own badges or admins view all" ON public.user_badges FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_badges' AND policyname = 'System can insert badges') THEN
    CREATE POLICY "System can insert badges" ON public.user_badges FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_streaks' AND policyname = 'Users can view own streaks or admins view all') THEN
    CREATE POLICY "Users can view own streaks or admins view all" ON public.user_streaks FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_streaks' AND policyname = 'Users can update own streaks') THEN
    CREATE POLICY "Users can update own streaks" ON public.user_streaks FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_streaks' AND policyname = 'System can insert streaks') THEN
    CREATE POLICY "System can insert streaks" ON public.user_streaks FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Functions
CREATE OR REPLACE FUNCTION award_points(
  p_user_id uuid,
  p_points integer,
  p_source text,
  p_source_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.user_points (user_id, points, source, source_id, description)
  VALUES (p_user_id, p_points, p_source, p_source_id, p_description)
  ON CONFLICT (user_id, source, source_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id uuid) RETURNS void AS $$
DECLARE
  v_training_count integer;
  v_current_streak integer;
BEGIN
  SELECT COUNT(*) INTO v_training_count
  FROM public.training_assignments
  WHERE user_id = p_user_id AND status = 'completed';

  IF v_training_count >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
    VALUES (p_user_id, 'first_training', 'Primeiro Passo', 'Completou o primeiro treinamento', '🎯')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF v_training_count >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
    VALUES (p_user_id, 'training_5', 'Aprendiz Dedicado', 'Completou 5 treinamentos', '📚')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF v_training_count >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
    VALUES (p_user_id, 'training_10', 'Mestre do Conhecimento', 'Completou 10 treinamentos', '🏆')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  SELECT current_streak INTO v_current_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;

  IF v_current_streak >= 7 THEN
    INSERT INTO public.user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
    VALUES (p_user_id, 'streak_7', 'Semana de Ouro', '7 dias consecutivos de atividade', '🔥')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

