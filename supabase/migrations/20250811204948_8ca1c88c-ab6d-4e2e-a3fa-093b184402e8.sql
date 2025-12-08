-- Fix DISC test access for all authenticated users
-- Update the RLS policy to allow any authenticated user to access active tests
DROP POLICY IF EXISTS "Users can view their own tests or admins can view all" ON disc_tests;

CREATE POLICY "Users can view active tests or admins can view all" 
ON disc_tests FOR SELECT 
USING (
  is_active = true OR 
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Add new fields for enhanced job surveys (excluding benefits which already exists)
ALTER TABLE job_surveys 
ADD COLUMN IF NOT EXISTS work_days jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS daily_schedule jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS lunch_break text,
ADD COLUMN IF NOT EXISTS weekly_hours integer,
ADD COLUMN IF NOT EXISTS salary_min numeric,
ADD COLUMN IF NOT EXISTS salary_max numeric,
ADD COLUMN IF NOT EXISTS has_commission boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_details text;

-- Update existing records to have default values for new fields
UPDATE job_surveys 
SET 
  work_days = COALESCE(work_days, '["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]'::jsonb),
  daily_schedule = COALESCE(daily_schedule, '{"Segunda": {"start": "08:00", "end": "18:00"}, "Terça": {"start": "08:00", "end": "18:00"}, "Quarta": {"start": "08:00", "end": "18:00"}, "Quinta": {"start": "08:00", "end": "18:00"}, "Sexta": {"start": "08:00", "end": "18:00"}}'::jsonb),
  lunch_break = COALESCE(lunch_break, '12:00 às 13:00'),
  weekly_hours = COALESCE(weekly_hours, 40),
  benefits = COALESCE(benefits, '["Vale Alimentação", "Vale Transporte", "Plano de Saúde"]'::jsonb);