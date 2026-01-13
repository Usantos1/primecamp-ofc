-- ============================================
-- SCRIPT DE VERIFICAÇÃO DO SCHEMA COMPLETO
-- Compara o banco atual com o schema esperado
-- Execute este script para identificar divergências
-- ============================================

-- ============================================
-- 1. LISTAR TODAS AS TABELAS DO BANCO
-- ============================================
SELECT 
    table_name,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- 2. VERIFICAR TABELAS ESPERADAS (Core)
-- ============================================
SELECT 
    'TABELA' as tipo,
    table_name as nome,
    CASE 
        WHEN table_name IN (
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('companies'),
    ('users'),
    ('sales'),
    ('sale_items'),
    ('ordens_servico'),
    ('produtos'),
    ('clientes'),
    ('payments'),
    ('cash_register_sessions'),
    ('cash_movements'),
    ('warranties'),
    ('documents'),
    ('audit_logs')
) AS expected_tables(table_name)
ORDER BY status DESC, nome;

-- ============================================
-- 3. VERIFICAR TABELAS FINANCEIRO IA
-- ============================================
SELECT 
    'TABELA FINANCEIRO' as tipo,
    table_name as nome,
    CASE 
        WHEN table_name IN (
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('dre'),
    ('planejamento_anual'),
    ('ia_recomendacoes'),
    ('ia_previsoes'),
    ('vendas_snapshot_diario'),
    ('produto_analise_mensal'),
    ('vendedor_analise_mensal'),
    ('vendas_analise_temporal')
) AS expected_tables(table_name)
ORDER BY status DESC, nome;

-- ============================================
-- 4. VERIFICAR COLUNA company_id EM TABELAS PRINCIPAIS
-- ============================================
SELECT 
    'COLUNA company_id' as tipo,
    t.table_name as tabela,
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✅ TEM company_id'
        ELSE '❌ SEM company_id'
    END as status
FROM (VALUES
    ('sales'),
    ('ordens_servico'),
    ('produtos'),
    ('clientes'),
    ('users'),
    ('dre'),
    ('planejamento_anual'),
    ('ia_recomendacoes')
) AS expected_tables(table_name) t
LEFT JOIN information_schema.columns c 
    ON c.table_schema = 'public' 
    AND c.table_name = t.table_name 
    AND c.column_name = 'company_id'
ORDER BY status DESC, tabela;

-- ============================================
-- 5. VERIFICAR COLUNAS IMPORTANTES EM sales
-- ============================================
SELECT 
    'COLUNA sales' as tipo,
    column_name as coluna,
    data_type as tipo_dado,
    CASE 
        WHEN column_name IN (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'sales'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('sale_origin', 'TEXT'),
    ('cash_register_session_id', 'UUID'),
    ('company_id', 'UUID'),
    ('numero', 'INTEGER'),
    ('status', 'TEXT'),
    ('total', 'NUMERIC'),
    ('cliente_id', 'UUID'),
    ('vendedor_id', 'UUID'),
    ('cashier_user_id', 'UUID'),
    ('technician_id', 'UUID')
) AS expected_columns(column_name, data_type)
ORDER BY status DESC, column_name;

-- ============================================
-- 6. VERIFICAR COLUNAS IMPORTANTES EM ordens_servico
-- ============================================
SELECT 
    'COLUNA ordens_servico' as tipo,
    column_name as coluna,
    CASE 
        WHEN column_name IN (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'ordens_servico'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('company_id'),
    ('numero'),
    ('status'),
    ('cliente_id'),
    ('tecnico_id'),
    ('valor_total'),
    ('data_entrada'),
    ('data_saida'),
    ('printed_at'),
    ('print_status')
) AS expected_columns(column_name)
ORDER BY status DESC, column_name;

-- ============================================
-- 7. VERIFICAR COLUNAS IMPORTANTES EM produtos
-- ============================================
SELECT 
    'COLUNA produtos' as tipo,
    column_name as coluna,
    CASE 
        WHEN column_name IN (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'produtos'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('company_id'),
    ('nome'),
    ('codigo'),
    ('codigo_barras'),
    ('preco_custo'),
    ('preco_venda'),
    ('quantidade'),
    ('estoque_atual'),
    ('estoque_minimo'),
    ('ativo'),
    ('situacao')
) AS expected_columns(column_name)
ORDER BY status DESC, column_name;

-- ============================================
-- 8. VERIFICAR COLUNAS IMPORTANTES EM clientes
-- ============================================
SELECT 
    'COLUNA clientes' as tipo,
    column_name as coluna,
    CASE 
        WHEN column_name IN (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'clientes'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('company_id'),
    ('nome'),
    ('email'),
    ('telefone'),
    ('cpf_cnpj'),
    ('endereco'),
    ('ativo'),
    ('situacao')
) AS expected_columns(column_name)
ORDER BY status DESC, column_name;

-- ============================================
-- 9. VERIFICAR COLUNAS EM bills_to_pay (se tabela existir)
-- ============================================
SELECT 
    'COLUNA bills_to_pay' as tipo,
    column_name as coluna,
    CASE 
        WHEN column_name IN (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'bills_to_pay'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (VALUES
    ('company_id'),
    ('amount'),
    ('status'),
    ('payment_date'),
    ('paid_at'),
    ('paid_date'),
    ('pago_em'),
    ('due_date')
) AS expected_columns(column_name)
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'bills_to_pay'
)
ORDER BY status DESC, column_name;

-- ============================================
-- 10. VERIFICAR ÍNDICES IMPORTANTES
-- ============================================
SELECT 
    'INDICE' as tipo,
    tablename || '.' || indexname as nome,
    '✅ EXISTE' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- 11. VERIFICAR FOREIGN KEYS
-- ============================================
SELECT
    'FOREIGN KEY' as tipo,
    tc.table_name || '.' || kcu.column_name as origem,
    ccu.table_name || '.' || ccu.column_name as destino,
    '✅ EXISTE' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 12. RESUMO DE PROBLEMAS IDENTIFICADOS
-- ============================================
-- Execute todas as queries acima e compare os resultados
-- Este script serve apenas para VERIFICAR, não para CORRIGIR
-- Para correções, use os scripts de migração específicos
