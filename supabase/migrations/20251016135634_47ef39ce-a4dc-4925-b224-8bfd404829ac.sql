-- Migration: Convert existing trainings to module/lesson structure

-- For each existing training with a video_url, create a default module and lesson
DO $$
DECLARE
  training_record RECORD;
  new_module_id UUID;
BEGIN
  -- Loop through all trainings that have a video_url
  FOR training_record IN 
    SELECT id, title, video_url, duration_minutes 
    FROM public.trainings 
    WHERE video_url IS NOT NULL AND video_url != ''
  LOOP
    -- Create a default module for this training
    INSERT INTO public.training_modules (
      training_id,
      title,
      description,
      order_index
    ) VALUES (
      training_record.id,
      'Conteúdo Principal',
      'Módulo de conteúdo do treinamento',
      0
    ) RETURNING id INTO new_module_id;

    -- Create a lesson with the video_url
    INSERT INTO public.training_lessons (
      module_id,
      title,
      description,
      video_url,
      duration_minutes,
      order_index
    ) VALUES (
      new_module_id,
      training_record.title,
      'Aula principal do treinamento',
      training_record.video_url,
      training_record.duration_minutes,
      0
    );
  END LOOP;
END $$;

-- Make video_url nullable since it's now stored in lessons
ALTER TABLE public.trainings 
ALTER COLUMN video_url DROP NOT NULL;