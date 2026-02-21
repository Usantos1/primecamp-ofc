-- ============================================
-- ADICIONAR CAMPO os_faturada NA TABELA ordens_servico
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- Adicionar campo para indicar se OS foi faturada
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS os_faturada BOOLEAN DEFAULT false;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_ordens_servico_os_faturada ON public.ordens_servico(os_faturada);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);

-- Comentário
COMMENT ON COLUMN public.ordens_servico.os_faturada IS 'Indica se a OS foi faturada através do PDV';

