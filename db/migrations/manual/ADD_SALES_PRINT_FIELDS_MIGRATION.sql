-- ============================================
-- MIGRAÇÃO: ADICIONAR CAMPOS DE IMPRESSÃO EM sales
-- PARTE 5 - PDV (IMPRESSÃO AUTOMÁTICA)
-- ============================================
-- Execute este script no banco de dados
-- ============================================

-- Adicionar campos para rastreamento de impressão
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS print_status TEXT CHECK (print_status IN ('SUCCESS', 'ERROR', NULL));

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS print_attempts INTEGER DEFAULT 0;

-- Criar índices para consultas
CREATE INDEX IF NOT EXISTS idx_sales_print_status ON public.sales(print_status);

-- Comentários para documentação
COMMENT ON COLUMN public.sales.printed_at IS 'Data/hora da última impressão bem-sucedida do cupom';
COMMENT ON COLUMN public.sales.print_status IS 'Status da última impressão: SUCCESS, ERROR ou NULL';
COMMENT ON COLUMN public.sales.print_attempts IS 'Número de tentativas de impressão do cupom';
