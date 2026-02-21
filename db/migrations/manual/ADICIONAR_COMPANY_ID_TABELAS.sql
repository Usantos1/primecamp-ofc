-- =====================================================
-- ADICIONAR company_id NAS TABELAS EXISTENTES
-- Migração para multi-tenancy
-- =====================================================

-- Adicionar company_id em todas as tabelas principais
-- Se não tiver company_id, assume empresa admin (ID fixo)

DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
    companies_exists BOOLEAN;
BEGIN
    -- Verificar se tabela companies existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'companies'
    ) INTO companies_exists;
    
    IF NOT companies_exists THEN
        RAISE EXCEPTION 'Tabela companies não existe! Execute primeiro CRIAR_SISTEMA_REVENDA.sql';
    END IF;
    
    -- Verificar se empresa admin existe
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = admin_company_id) THEN
        RAISE EXCEPTION 'Empresa admin não encontrada! Execute primeiro CRIAR_SISTEMA_REVENDA.sql';
    END IF;
    
    -- Tabela de usuários
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'users' AND column_name = 'company_id') THEN
            ALTER TABLE public.users ADD COLUMN company_id UUID;
            UPDATE public.users SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.users ADD CONSTRAINT fk_users_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.users ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em users';
        END IF;
    END IF;

    -- Tabela de produtos
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'produtos') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'produtos' AND column_name = 'company_id') THEN
            ALTER TABLE public.produtos ADD COLUMN company_id UUID;
            UPDATE public.produtos SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.produtos ADD CONSTRAINT fk_produtos_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.produtos ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_produtos_company_id ON public.produtos(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em produtos';
        END IF;
    END IF;

    -- Tabela de ordens de serviço
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'ordens_servico') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'ordens_servico' AND column_name = 'company_id') THEN
            ALTER TABLE public.ordens_servico ADD COLUMN company_id UUID;
            UPDATE public.ordens_servico SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.ordens_servico ADD CONSTRAINT fk_ordens_servico_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.ordens_servico ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_ordens_servico_company_id ON public.ordens_servico(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em ordens_servico';
        END IF;
    END IF;

    -- Tabela de clientes
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'clientes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'clientes' AND column_name = 'company_id') THEN
            ALTER TABLE public.clientes ADD COLUMN company_id UUID;
            UPDATE public.clientes SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.clientes ADD CONSTRAINT fk_clientes_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.clientes ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_clientes_company_id ON public.clientes(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em clientes';
        END IF;
    END IF;

    -- Tabela de time_clock
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'time_clock') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'time_clock' AND column_name = 'company_id') THEN
            ALTER TABLE public.time_clock ADD COLUMN company_id UUID;
            UPDATE public.time_clock SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.time_clock ADD CONSTRAINT fk_time_clock_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.time_clock ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_time_clock_company_id ON public.time_clock(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em time_clock';
        END IF;
    END IF;

    -- Tabela de vendas/caixa
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'vendas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'vendas' AND column_name = 'company_id') THEN
            ALTER TABLE public.vendas ADD COLUMN company_id UUID;
            UPDATE public.vendas SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.vendas ADD CONSTRAINT fk_vendas_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.vendas ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_vendas_company_id ON public.vendas(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em vendas';
        END IF;
    END IF;

    -- Adicionar em outras tabelas conforme necessário
    -- Repetir o padrão acima para cada tabela
    
END $$;

SELECT 'Migração de company_id concluída!' AS resultado;

