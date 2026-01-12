-- ============================================
-- CRIAR TABELA COMPANIES
-- ============================================
-- Execute este script para criar a tabela companies
-- ============================================

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj) WHERE cnpj IS NOT NULL;

-- Inserir empresa padrão (Prime Camp)
INSERT INTO public.companies (id, name, cnpj, status, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Prime Camp LTDA',
    '12345678000190',
    'active',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verificar resultado
SELECT id, name, cnpj, status FROM public.companies WHERE id = '00000000-0000-0000-0000-000000000001';
