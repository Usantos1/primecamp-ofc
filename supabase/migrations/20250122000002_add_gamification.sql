-- Create user_points table for tracking points
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  source text NOT NULL, -- 'training_completed', 'quiz_passed', 'streak', etc.
  source_id uuid, -- ID of the source (training_id, quiz_id, etc.)
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source, source_id)
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type text NOT NULL, -- 'first_training', 'perfect_score', 'streak_7', etc.
  badge_name text NOT NULL,
  badge_description text,
  badge_icon text, -- Icon name or emoji
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Create user_streaks table for tracking daily activity
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
CREATE POLICY "Users can view own points or admins view all"
ON public.user_points FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert points"
ON public.user_points FOR INSERT
WITH CHECK (true); -- Points are inserted by system/triggers

CREATE POLICY "Users can view own badges or admins view all"
ON public.user_badges FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert badges"
ON public.user_badges FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view own streaks or admins view all"
ON public.user_streaks FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own streaks"
ON public.user_streaks FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert streaks"
ON public.user_streaks FOR INSERT
WITH CHECK (true);

-- Function to award points
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

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id uuid) RETURNS void AS $$
DECLARE
  v_training_count integer;
  v_perfect_quizzes integer;
  v_current_streak integer;
BEGIN
  -- Count completed trainings
  SELECT COUNT(*) INTO v_training_count
  FROM public.training_assignments
  WHERE user_id = p_user_id AND status = 'completed';

  -- Award first training badge
  IF v_training_count >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
    VALUES (p_user_id, 'first_training', 'Primeiro Passo', 'Completou o primeiro treinamento', '🎯')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Award training milestones
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

  -- Check streak
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

