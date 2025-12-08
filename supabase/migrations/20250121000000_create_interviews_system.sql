-- Sistema de Entrevistas com IA
-- Tabela para armazenar entrevistas (online e presencial)

CREATE TABLE IF NOT EXISTS public.job_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_response_id UUID NOT NULL REFERENCES public.job_responses(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES public.job_surveys(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('online', 'presencial')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  meet_link TEXT, -- Link do Google Meet para entrevistas online
  location TEXT, -- Endereço para entrevistas presenciais
  interviewer_id UUID REFERENCES auth.users(id),
  questions JSONB DEFAULT '[]'::jsonb, -- Perguntas geradas pela IA
  transcription TEXT, -- Transcrição da entrevista
  ai_evaluation JSONB, -- Avaliação da IA baseada na transcrição
  ai_recommendation TEXT CHECK (ai_recommendation IN ('approved', 'rejected', 'manual_review')),
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  notes TEXT, -- Notas adicionais do entrevistador
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_response_id, interview_type, status) -- Uma entrevista ativa por tipo por candidato
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_job_interviews_response_id ON public.job_interviews(job_response_id);
CREATE INDEX IF NOT EXISTS idx_job_interviews_survey_id ON public.job_interviews(survey_id);
CREATE INDEX IF NOT EXISTS idx_job_interviews_status ON public.job_interviews(status);
CREATE INDEX IF NOT EXISTS idx_job_interviews_type ON public.job_interviews(interview_type);
CREATE INDEX IF NOT EXISTS idx_job_interviews_scheduled_at ON public.job_interviews(scheduled_at);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_job_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_interviews_updated_at
BEFORE UPDATE ON public.job_interviews
FOR EACH ROW
EXECUTE FUNCTION update_job_interviews_updated_at();

-- RLS Policies
ALTER TABLE public.job_interviews ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todas as entrevistas
CREATE POLICY "Admins can view all interviews"
ON public.job_interviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins podem criar/atualizar entrevistas
CREATE POLICY "Admins can manage interviews"
ON public.job_interviews
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Sistema pode gerenciar entrevistas (via edge functions)
CREATE POLICY "System can manage interviews"
ON public.job_interviews
FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela para DISC curto integrado no formulário
-- Vamos adicionar um campo no job_application_drafts para armazenar respostas DISC curtas
ALTER TABLE public.job_application_drafts 
ADD COLUMN IF NOT EXISTS disc_short_responses JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS disc_short_profile TEXT; -- Perfil dominante do DISC curto

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_job_application_drafts_disc_profile 
ON public.job_application_drafts(disc_short_profile);

