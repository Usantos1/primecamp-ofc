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
CREATE POLICY "Users can view own bookmarks"
ON public.lesson_bookmarks
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own bookmarks
CREATE POLICY "Users can insert own bookmarks"
ON public.lesson_bookmarks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bookmarks
CREATE POLICY "Users can update own bookmarks"
ON public.lesson_bookmarks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
ON public.lesson_bookmarks
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER set_updated_at_lesson_bookmarks
  BEFORE UPDATE ON public.lesson_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

