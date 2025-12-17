-- ============================================
-- APLICAR TODAS AS MIGRATIONS DE FINANCEIRO
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- ============================================
-- 1. INTEGRAÇÃO DE VENDAS COM TRANSAÇÕES FINANCEIRAS
-- ============================================
\i supabase/migrations/20250131000000_integrate_sales_to_financial_transactions.sql

-- ============================================
-- 2. INTEGRAÇÃO DE CAIXA DO PDV COM FECHAMENTO FINANCEIRO
-- ============================================
\i supabase/migrations/20250131000001_integrate_cash_register_to_cash_closing.sql

-- ============================================
-- NOTA: Se o comando \i não funcionar, copie e cole o conteúdo
-- de cada arquivo de migration diretamente no SQL Editor
-- ============================================

