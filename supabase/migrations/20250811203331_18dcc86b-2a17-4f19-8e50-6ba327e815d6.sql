-- Adicionar campos de horário de trabalho e modalidade
ALTER TABLE public.job_surveys 
ADD COLUMN work_schedule TEXT,
ADD COLUMN work_modality TEXT DEFAULT 'presencial';