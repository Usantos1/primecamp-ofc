-- ============================================
-- SCRIPT DE VERIFICAÇÃO PÓS-APLICAÇÃO DAS MIGRATIONS
-- Execute este script APÓS aplicar cada migration
-- para verificar se foi aplicada com sucesso
-- ============================================

-- ============================================
-- 1. VERIFICAR MIGRATION 1: CRIAR_SISTEMA_REVENDA
-- ============================================
SELECT 
    'MIGRATION 1' as migration,
    'CRIAR_SISTEMA_REVENDA' as script,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'companies'
        ) THEN '✅ companies EXISTE'
        ELSE '❌ companies FALTANDO'
    END as status_companies,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        ) THEN '✅ users EXISTE'
        ELSE '❌ users FALTANDO'
    END as status_users;

-- ============================================
-- 2. VERIFICAR MIGRATION 2: ADICIONAR_COMPANY_ID
-- ============================================
SELECT 
    'MIGRATION 2' as migration,
    'ADICIONAR_COMPANY_ID' as script,
    table_name as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = t.table_name
              AND column_name = 'company_id'
        ) THEN '✅ TEM company_id'
        ELSE '❌ SEM company_id'
    END as status
FROM (VALUES
    ('sales'),
    ('ordens_servico'),
    ('produtos'),
    ('clientes'),
    ('users'),
    ('sale_items'),
    ('os_items'),
    ('payments'),
    ('cash_register_sessions'),
    ('bills_to_pay'),
    ('dre'),
    ('planejamento_anual')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.table_name
)
ORDER BY 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = t.table_name
              AND column_name = 'company_id'
        ) THEN 1
        ELSE 0
    END,
    tabela;

-- ============================================
-- 3. VERIFICAR MIGRATION 3: ADD_SALE_ORIGIN
-- ============================================
SELECT 
    'MIGRATION 3' as migration,
    'ADD_SALE_ORIGIN' as script,
    column_name as coluna,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'sales'
              AND column_name = c.column_name
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('sale_origin'),
    ('technician_id'),
    ('cashier_user_id')
) AS c(column_name)
ORDER BY 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'sales'
              AND column_name = c.column_name
        ) THEN 1
        ELSE 0
    END,
    coluna;

-- ============================================
-- 4. VERIFICAR MIGRATION 4: ADD_CASH_SESSION
-- ============================================
SELECT 
    'MIGRATION 4' as migration,
    'ADD_CASH_SESSION' as script,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'sales'
              AND column_name = 'cash_register_session_id'
        ) THEN '✅ cash_register_session_id EXISTE'
        ELSE '❌ cash_register_session_id FALTANDO'
    END as status;

-- ============================================
-- 5. VERIFICAR MIGRATION 5: TABELAS IA FINANCEIRO
-- ============================================
SELECT 
    'MIGRATION 5' as migration,
    'CRIAR_TABELAS_IA_FINANCEIRO' as script,
    table_name as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = t.table_name
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('vendas_snapshot_diario'),
    ('produto_analise_mensal'),
    ('vendedor_analise_mensal'),
    ('vendas_analise_temporal'),
    ('ia_previsoes')
) AS t(table_name)
ORDER BY 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = t.table_name
        ) THEN 1
        ELSE 0
    END,
    tabela;

-- ============================================
-- 6. RESUMO GERAL DE STATUS
-- ============================================
SELECT 
    'RESUMO GERAL' as tipo,
    COUNT(DISTINCT CASE 
        WHEN table_name IN ('companies', 'users', 'sales', 'produtos', 'clientes', 'ordens_servico')
        THEN table_name 
    END) || ' / 6' as tabelas_core,
    COUNT(DISTINCT CASE 
        WHEN column_name = 'company_id'
        THEN table_name 
    END) || ' / 12+' as tabelas_com_company_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'sales'
              AND column_name IN ('sale_origin', 'cash_register_session_id')
        ) THEN '✅ SIM'
        ELSE '❌ NÃO'
    END as sales_colunas_importantes
FROM information_schema.columns
WHERE table_schema = 'public';
