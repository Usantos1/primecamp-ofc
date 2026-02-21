-- ============================================
-- MIGRAÇÃO: ADICIONAR CAMPOS DE IMPRESSÃO EM ordens_servico
-- PARTE 4 - FLUXO DA ORDEM DE SERVIÇO
-- ============================================
-- Execute este script no banco de dados
-- ============================================

-- Adicionar campos para rastreamento de impressão
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS print_status TEXT CHECK (print_status IN ('SUCCESS', 'ERROR', NULL));

ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS print_attempts INTEGER DEFAULT 0;

-- Criar índice para consultas
CREATE INDEX IF NOT EXISTS idx_ordens_servico_print_status ON public.ordens_servico(print_status);

-- Comentários para documentação
COMMENT ON COLUMN public.ordens_servico.printed_at IS 'Data/hora da última impressão bem-sucedida';
COMMENT ON COLUMN public.ordens_servico.print_status IS 'Status da última impressão: SUCCESS, ERROR ou NULL';
COMMENT ON COLUMN public.ordens_servico.print_attempts IS 'Número de tentativas de impressão';
