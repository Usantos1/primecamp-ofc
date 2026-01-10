-- Criar tabela para rascunhos de candidatura
CREATE TABLE IF NOT EXISTS job_application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES job_surveys(id) ON DELETE CASCADE,
  email VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(50),
  age INTEGER,
  cep VARCHAR(20),
  address TEXT,
  whatsapp VARCHAR(50),
  instagram VARCHAR(100),
  linkedin TEXT,
  responses JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  form_data JSONB DEFAULT '{}',
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_job_drafts_survey_id ON job_application_drafts(survey_id);
CREATE INDEX IF NOT EXISTS idx_job_drafts_email ON job_application_drafts(email);
CREATE INDEX IF NOT EXISTS idx_job_drafts_company_id ON job_application_drafts(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_drafts_survey_email ON job_application_drafts(survey_id, email);

-- Adicionar colunas extras na job_responses se não existirem
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS linkedin TEXT;

