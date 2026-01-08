-- =====================================================
-- SCRIPT CRÍTICO: ADICIONAR company_id EM TODAS TABELAS
-- Este script adiciona a coluna company_id nas tabelas
-- que ainda não têm, garantindo isolamento de dados
-- =====================================================

-- Função auxiliar para adicionar company_id se não existir
DO $$
DECLARE
    tables_to_update TEXT[] := ARRAY[
        'sales',
        'sale_items',
        'os_items',
        'produto_movimentacoes',
        'nps_surveys',
        'nps_responses',
        'job_surveys',
        'job_responses',
        'job_application_drafts',
        'job_candidate_ai_analysis',
        'job_candidate_evaluations',
        'job_interviews',
        'candidate_responses',
        'caixa_sessions',
        'caixa_movements',
        'marcas',
        'modelos'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables_to_update
    LOOP
        -- Verificar se a tabela existe
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            -- Verificar se a coluna company_id já existe
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = tbl 
                AND column_name = 'company_id'
            ) THEN
                EXECUTE format(
                    'ALTER TABLE public.%I ADD COLUMN company_id UUID REFERENCES companies(id)',
                    tbl
                );
                RAISE NOTICE 'Coluna company_id adicionada em %', tbl;
            ELSE
                RAISE NOTICE 'Coluna company_id já existe em %', tbl;
            END IF;
        ELSE
            RAISE NOTICE 'Tabela % não existe, pulando...', tbl;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- ATUALIZAR DADOS EXISTENTES COM company_id PADRÃO
-- (Para dados que foram criados antes do isolamento)
-- =====================================================

-- Primeiro, identificar a empresa principal (Prime Camp)
DO $$
DECLARE
    prime_camp_id UUID;
BEGIN
    -- Buscar ID da Prime Camp (ou primeira empresa)
    SELECT id INTO prime_camp_id FROM companies 
    WHERE name ILIKE '%prime%camp%' OR id = '00000000-0000-0000-0000-000000000001'
    LIMIT 1;
    
    IF prime_camp_id IS NULL THEN
        SELECT id INTO prime_camp_id FROM companies LIMIT 1;
    END IF;
    
    IF prime_camp_id IS NOT NULL THEN
        RAISE NOTICE 'Empresa principal identificada: %', prime_camp_id;
        
        -- Atualizar tabelas que podem ter dados órfãos
        UPDATE sales SET company_id = prime_camp_id WHERE company_id IS NULL;
        UPDATE sale_items SET company_id = prime_camp_id WHERE company_id IS NULL;
        UPDATE job_surveys SET company_id = prime_camp_id WHERE company_id IS NULL;
        UPDATE job_responses SET company_id = prime_camp_id WHERE company_id IS NULL;
        
        RAISE NOTICE 'Dados órfãos atualizados para empresa %', prime_camp_id;
    ELSE
        RAISE WARNING 'Nenhuma empresa encontrada para atualizar dados órfãos';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao atualizar dados órfãos: %', SQLERRM;
END $$;

-- =====================================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

DO $$
DECLARE
    tables_to_index TEXT[] := ARRAY[
        'sales',
        'sale_items',
        'produtos',
        'clientes',
        'ordens_servico',
        'job_surveys',
        'job_responses',
        'time_clock'
    ];
    tbl TEXT;
    idx_name TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables_to_index
    LOOP
        idx_name := 'idx_' || tbl || '_company_id';
        
        -- Verificar se tabela e coluna existem
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = tbl 
            AND column_name = 'company_id'
        ) THEN
            -- Verificar se índice já existe
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND tablename = tbl 
                AND indexname = idx_name
            ) THEN
                EXECUTE format(
                    'CREATE INDEX %I ON public.%I (company_id)',
                    idx_name, tbl
                );
                RAISE NOTICE 'Índice % criado em %', idx_name, tbl;
            ELSE
                RAISE NOTICE 'Índice % já existe em %', idx_name, tbl;
            END IF;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
    t.table_name,
    CASE WHEN c.column_name IS NOT NULL THEN '✅ OK' ELSE '❌ FALTANDO' END as company_id_status
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON c.table_schema = t.table_schema 
    AND c.table_name = t.table_name 
    AND c.column_name = 'company_id'
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND t.table_name IN (
    'sales', 'sale_items', 'produtos', 'vendas', 'clientes', 
    'ordens_servico', 'job_surveys', 'job_responses', 'time_clock',
    'users', 'nps_surveys', 'nps_responses', 'payments'
)
ORDER BY t.table_name;

