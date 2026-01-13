-- ============================================
-- SCRIPT DE ANÁLISE DOS RESULTADOS DA VERIFICAÇÃO
-- Execute este script APÓS executar VERIFICAR_SCHEMA_COMPLETO.sql
-- Este script cria tabelas temporárias para análise
-- ============================================

-- ============================================
-- 1. RESUMO DE TABELAS FALTANTES
-- ============================================
SELECT 
    'TABELA FALTANDO' as tipo,
    table_name as nome,
    '❌ FALTANDO' as status
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
    ('audit_logs'),
    ('dre'),
    ('planejamento_anual'),
    ('ia_recomendacoes'),
    ('ia_previsoes'),
    ('vendas_snapshot_diario'),
    ('produto_analise_mensal'),
    ('vendedor_analise_mensal'),
    ('vendas_analise_temporal')
) AS expected_tables(table_name)
WHERE table_name NOT IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
)
ORDER BY nome;

-- ============================================
-- 2. RESUMO DE COLUNAS company_id FALTANTES
-- ============================================
SELECT 
    'company_id FALTANDO' as tipo,
    t.table_name as tabela,
    '❌ SEM company_id' as status
FROM (VALUES
    ('sales'),
    ('ordens_servico'),
    ('produtos'),
    ('clientes'),
    ('users'),
    ('dre'),
    ('planejamento_anual'),
    ('ia_recomendacoes'),
    ('sale_items'),
    ('os_items'),
    ('payments'),
    ('cash_register_sessions'),
    ('bills_to_pay')
) AS t(table_name)
WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name 
      AND c.column_name = 'company_id'
)
AND EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = t.table_name
)
ORDER BY tabela;

-- ============================================
-- 3. RESUMO DE COLUNAS IMPORTANTES FALTANTES EM sales
-- ============================================
SELECT 
    'COLUNA sales FALTANDO' as tipo,
    column_name as coluna,
    '❌ FALTANDO' as status
FROM (VALUES
    ('sale_origin'),
    ('cash_register_session_id'),
    ('company_id'),
    ('cashier_user_id'),
    ('technician_id')
) AS expected_columns(column_name)
WHERE column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sales'
)
AND EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'sales'
)
ORDER BY coluna;

-- ============================================
-- 4. RESUMO DE COLUNAS IMPORTANTES FALTANTES EM bills_to_pay
-- ============================================
SELECT 
    'COLUNA bills_to_pay FALTANDO' as tipo,
    column_name as coluna,
    '❌ FALTANDO' as status
FROM (VALUES
    ('payment_date'),
    ('company_id')
) AS expected_columns(column_name)
WHERE column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'bills_to_pay'
)
AND EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'bills_to_pay'
)
ORDER BY coluna;

-- ============================================
-- 5. PLANO DE CORREÇÕES PRIORITÁRIAS
-- ============================================
-- Este SELECT mostra a ordem recomendada de aplicação das migrations
SELECT 
    'PRIORIDADE' as tipo,
    prioridade as ordem,
    migracao as script,
    descricao as acao
FROM (VALUES
    (1, 'CRIAR_SISTEMA_REVENDA_CORRIGIDO.sql', 'Criar tabelas core (companies, users, etc) - SE NÃO EXISTIREM'),
    (2, 'sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql', 'Adicionar company_id em TODAS as tabelas - CRÍTICO'),
    (3, 'ADD_SALE_ORIGIN_MIGRATION.sql', 'Adicionar sale_origin em sales - ALTO'),
    (4, 'ADD_CASH_SESSION_TO_SALES.sql', 'Adicionar cash_register_session_id em sales - ALTO'),
    (5, 'sql/CRIAR_TABELAS_IA_FINANCEIRO.sql', 'Criar tabelas Financeiro IA - MÉDIO'),
    (6, 'APLICAR_TODAS_MIGRATIONS_FINANCEIRO.sql', 'Aplicar migrations financeiro completas - MÉDIO')
) AS plano(prioridade, migracao, descricao)
ORDER BY prioridade;
