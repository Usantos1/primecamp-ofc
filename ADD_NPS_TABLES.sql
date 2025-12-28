-- Tabelas para o sistema NPS (Net Promoter Score)

-- Tabela de pesquisas NPS
CREATE TABLE IF NOT EXISTS public.nps_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    allowed_respondents UUID[] DEFAULT '{}',
    target_employees UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de respostas NPS
CREATE TABLE IF NOT EXISTS public.nps_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.nps_surveys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL DEFAULT '{}',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(survey_id, user_id, date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nps_surveys_created_by ON public.nps_surveys(created_by);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_is_active ON public.nps_surveys(is_active);
CREATE INDEX IF NOT EXISTS idx_nps_responses_survey_id ON public.nps_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_user_id ON public.nps_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_date ON public.nps_responses(date);

-- Trigger para atualizar updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_nps_surveys_updated_at') THEN
        CREATE TRIGGER set_nps_surveys_updated_at
        BEFORE UPDATE ON public.nps_surveys
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp_column();
    END IF;
END
$$;

-- Comentários
COMMENT ON TABLE public.nps_surveys IS 'Pesquisas de NPS (Net Promoter Score)';
COMMENT ON TABLE public.nps_responses IS 'Respostas das pesquisas NPS';
COMMENT ON COLUMN public.nps_surveys.questions IS 'Array JSON com as perguntas da pesquisa';
COMMENT ON COLUMN public.nps_surveys.allowed_respondents IS 'Lista de IDs de usuários que podem responder (vazio = todos)';
COMMENT ON COLUMN public.nps_surveys.target_employees IS 'Lista de IDs de funcionários alvo da pesquisa';
COMMENT ON COLUMN public.nps_responses.responses IS 'Objeto JSON com as respostas (satisfaction, recommendation, etc)';

