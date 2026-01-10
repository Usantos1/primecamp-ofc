-- Criar tabela para rascunhos de candidatura
CREATE TABLE IF NOT EXISTS job_application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES job_surveys(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  age INTEGER,
  cep TEXT,
  address TEXT,
  whatsapp TEXT,
  instagram TEXT,
  linkedin TEXT,
  responses JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  form_data JSONB DEFAULT '{}',
  company_id UUID,
  last_saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_survey_email UNIQUE(survey_id, email)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_job_drafts_survey_id ON job_application_drafts(survey_id);
CREATE INDEX IF NOT EXISTS idx_job_drafts_email ON job_application_drafts(email);
CREATE INDEX IF NOT EXISTS idx_job_drafts_company_id ON job_application_drafts(company_id);
CREATE INDEX IF NOT EXISTS idx_job_drafts_last_saved ON job_application_drafts(last_saved_at);

-- Adicionar coluna last_saved_at se não existir (para tabelas já existentes)
ALTER TABLE job_application_drafts ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- Atualizar valores existentes
UPDATE job_application_drafts SET last_saved_at = updated_at WHERE last_saved_at IS NULL;
-- Tornar NOT NULL após preencher valores
ALTER TABLE job_application_drafts ALTER COLUMN last_saved_at SET NOT NULL;
ALTER TABLE job_application_drafts ALTER COLUMN last_saved_at SET DEFAULT NOW();

-- Adicionar colunas extras na job_responses se não existirem
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);
ALTER TABLE job_responses ADD COLUMN IF NOT EXISTS linkedin TEXT;

