-- ============================================
-- ADICIONAR company_id EM TODAS AS TABELAS NECESSÁRIAS
-- Script COMPLETO que adiciona a coluna em TODAS as tabelas do banco
-- ============================================

DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
    tbl_name TEXT;
    tables_to_skip TEXT[] := ARRAY[
        'companies',
        'plans',
        'subscriptions',
        'api_tokens',
        'api_access_logs',
        'migrations',
        'schema_migrations',
        '_prisma_migrations'
    ];
    all_tables TEXT[];
BEGIN
    -- Verificar se tabela companies existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND information_schema.tables.table_name = 'companies'
    ) THEN
        RAISE EXCEPTION 'Tabela companies não existe! Execute primeiro sql/CRIAR_TABELA_COMPANIES.sql';
    END IF;

    -- Buscar TODAS as tabelas do banco
    SELECT array_agg(information_schema.tables.table_name::TEXT)
    INTO all_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND information_schema.tables.table_name != ALL(tables_to_skip);

    -- Processar cada tabela
    IF all_tables IS NOT NULL THEN
        FOREACH tbl_name IN ARRAY all_tables
        LOOP
            -- Verificar se a coluna company_id já existe
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND information_schema.columns.table_name = tbl_name 
                AND column_name = 'company_id'
            ) THEN
                BEGIN
                    -- Adicionar coluna
                    EXECUTE format('ALTER TABLE public.%I ADD COLUMN company_id UUID', tbl_name);
                    
                    -- Definir valor padrão para registros existentes
                    EXECUTE format('UPDATE public.%I SET company_id = $1 WHERE company_id IS NULL', tbl_name) USING admin_company_id;
                    
                    -- Adicionar foreign key (se possível)
                    BEGIN
                        EXECUTE format(
                            'ALTER TABLE public.%I ADD CONSTRAINT fk_%I_company FOREIGN KEY (company_id) REFERENCES public.companies(id)',
                            tbl_name, tbl_name
                        );
                    EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Não foi possível adicionar FK em % (pode já existir ou erro): %', tbl_name, SQLERRM;
                    END;
                    
                    -- Criar índice
                    BEGIN
                        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_company_id ON public.%I(company_id)', tbl_name, tbl_name);
                    EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Não foi possível criar índice em %: %', tbl_name, SQLERRM;
                    END;
                    
                    RAISE NOTICE '✅ Coluna company_id adicionada em %', tbl_name;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '❌ Erro ao processar %: %', tbl_name, SQLERRM;
                END;
            ELSE
                RAISE NOTICE 'ℹ️  Coluna company_id já existe em %', tbl_name;
            END IF;
        END LOOP;
    END IF;
    
    RAISE NOTICE '✅ Migração concluída!';
END $$;

-- Verificar resultado - listar todas as tabelas com company_id
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'company_id'
ORDER BY table_name;
