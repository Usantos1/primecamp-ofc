-- ============================================
-- ADICIONAR COLUNA cash_register_session_id NA TABELA SALES
-- ============================================

-- Adicionar coluna para vincular venda à sessão de caixa
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cash_register_session_id UUID REFERENCES public.cash_register_sessions(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_sales_cash_register_session_id 
ON public.sales(cash_register_session_id);

-- Comentário na coluna
COMMENT ON COLUMN public.sales.cash_register_session_id IS 'ID da sessão de caixa em que a venda foi finalizada';

