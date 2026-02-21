-- ============================================
-- VERIFICAR STATUS DAS TABELAS FINANCEIRAS
-- Execute este script para verificar se as tabelas existem
-- ============================================

-- Verificar se as tabelas existem
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        ) THEN '✓ EXISTE'
        ELSE '✗ NÃO EXISTE'
    END as status
FROM (VALUES 
    ('financial_categories'),
    ('bills_to_pay'),
    ('cash_closings'),
    ('financial_transactions'),
    ('financial_alerts'),
    ('accounts_receivable')
) AS t(table_name);

-- Verificar se há categorias cadastradas
SELECT 
    COUNT(*) as total_categorias,
    COUNT(*) FILTER (WHERE type = 'entrada') as categorias_entrada,
    COUNT(*) FILTER (WHERE type = 'saida') as categorias_saida
FROM financial_categories;

-- Listar todas as categorias
SELECT id, name, type, is_active 
FROM financial_categories 
ORDER BY type, name;

-- Verificar RLS nas tabelas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename IN ('financial_categories', 'bills_to_pay', 'cash_closings', 'financial_transactions')
ORDER BY tablename, policyname;

