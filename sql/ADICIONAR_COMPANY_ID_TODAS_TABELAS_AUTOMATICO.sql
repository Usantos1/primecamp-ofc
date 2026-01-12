-- ============================================
-- ADICIONAR company_id EM TODAS AS TABELAS NECESSÁRIAS
-- Script automático que adiciona a coluna em todas as tabelas de uma vez
-- ============================================

DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
    table_name TEXT;
    tables_to_update TEXT[] := ARRAY[
        'produtos',
        'sales',
        'vendas',
        'clientes',
        'ordens_servico',
        'sale_items',
        'os_items',
        'marcas',
        'modelos',
        'produto_movimentacoes',
        'time_clock',
        'nps_surveys',
        'nps_responses',
        'job_surveys',
        'job_responses',
        'job_application_drafts',
        'job_candidate_ai_analysis',
        'job_candidate_evaluations',
        'job_interviews',
        'candidate_responses',
        'payments',
        'caixa_sessions',
        'caixa_movements',
        'configuracoes_empresa',
        'company_settings'
    ];
BEGIN
    -- Verificar se tabela companies existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'companies'
    ) THEN
        RAISE EXCEPTION 'Tabela companies não existe! Execute primeiro sql/CRIAR_TABELA_COMPANIES.sql';
    END IF;

    -- Processar cada tabela
    FOREACH table_name IN ARRAY tables_to_update
    LOOP
        -- Verificar se a tabela existe
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            -- Verificar se a coluna company_id já existe
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = table_name AND column_name = 'company_id'
            ) THEN
                -- Adicionar coluna
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN company_id UUID', table_name);
                
                -- Definir valor padrão para registros existentes
                EXECUTE format('UPDATE public.%I SET company_id = $1 WHERE company_id IS NULL', table_name) USING admin_company_id;
                
                -- Adicionar foreign key
                BEGIN
                    EXECUTE format(
                        'ALTER TABLE public.%I ADD CONSTRAINT fk_%I_company FOREIGN KEY (company_id) REFERENCES public.companies(id)',
                        table_name, table_name
                    );
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Não foi possível adicionar FK em % (pode já existir): %', table_name, SQLERRM;
                END;
                
                -- Criar índice
                BEGIN
                    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_company_id ON public.%I(company_id)', table_name, table_name);
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Não foi possível criar índice em %: %', table_name, SQLERRM;
                END;
                
                RAISE NOTICE '✅ Coluna company_id adicionada em %', table_name;
            ELSE
                RAISE NOTICE 'ℹ️  Coluna company_id já existe em %', table_name;
            END IF;
        ELSE
            RAISE NOTICE '⚠️  Tabela % não existe, pulando...', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Migração concluída!';
END $$;

-- Verificar resultado
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'company_id'
AND table_name IN ('produtos', 'sales', 'clientes', 'ordens_servico', 'marcas', 'modelos')
ORDER BY table_name;
