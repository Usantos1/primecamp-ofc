-- Tabelas para o sistema DISC

-- Tabela de testes DISC (templates)
CREATE TABLE IF NOT EXISTS public.disc_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT 'Teste DISC Padrão',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de respostas DISC de usuários internos
CREATE TABLE IF NOT EXISTS public.disc_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.disc_tests(id) ON DELETE SET NULL,
    responses JSONB DEFAULT '[]',
    d_score INTEGER DEFAULT 0,
    i_score INTEGER DEFAULT 0,
    s_score INTEGER DEFAULT 0,
    c_score INTEGER DEFAULT 0,
    dominant_profile TEXT,
    is_completed BOOLEAN DEFAULT false,
    completion_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de respostas DISC de candidatos externos
CREATE TABLE IF NOT EXISTS public.candidate_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    age INTEGER,
    whatsapp TEXT,
    email TEXT,
    company TEXT,
    responses JSONB DEFAULT '[]',
    d_score INTEGER DEFAULT 0,
    i_score INTEGER DEFAULT 0,
    s_score INTEGER DEFAULT 0,
    c_score INTEGER DEFAULT 0,
    dominant_profile TEXT,
    is_completed BOOLEAN DEFAULT false,
    completion_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_disc_responses_user_id ON public.disc_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_disc_responses_is_completed ON public.disc_responses(is_completed);
CREATE INDEX IF NOT EXISTS idx_disc_responses_completion_date ON public.disc_responses(completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_responses_is_completed ON public.candidate_responses(is_completed);
CREATE INDEX IF NOT EXISTS idx_candidate_responses_created_at ON public.candidate_responses(created_at DESC);

-- Inserir teste ativo padrão se não existir
INSERT INTO public.disc_tests (title, description, is_active)
SELECT 'Teste DISC Padrão', 'Teste padrão de perfil comportamental DISC', true
WHERE NOT EXISTS (SELECT 1 FROM public.disc_tests WHERE is_active = true);

-- Comentários
COMMENT ON TABLE public.disc_tests IS 'Templates de testes DISC';
COMMENT ON TABLE public.disc_responses IS 'Respostas de usuários internos ao teste DISC';
COMMENT ON TABLE public.candidate_responses IS 'Respostas de candidatos externos ao teste DISC';

