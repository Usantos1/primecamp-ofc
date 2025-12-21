-- ============================================
-- GARANTIR CAMPOS DE RESOLUÇÃO NA TABELA ORDENS_SERVICO
-- ============================================
-- Esta migration garante que todos os campos necessários para
-- a resolução do problema existam na tabela ordens_servico

-- Adicionar problema_constatado se não existir
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS problema_constatado TEXT;

-- Adicionar servico_executado se não existir
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS servico_executado TEXT;

-- Adicionar tecnico_id se não existir
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS tecnico_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Adicionar tecnico_nome se não existir
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS tecnico_nome TEXT;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tecnico_id ON public.ordens_servico(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_problema_constatado ON public.ordens_servico USING gin(to_tsvector('portuguese', COALESCE(problema_constatado, '')));
CREATE INDEX IF NOT EXISTS idx_ordens_servico_servico_executado ON public.ordens_servico USING gin(to_tsvector('portuguese', COALESCE(servico_executado, '')));

-- Comentários para documentação
COMMENT ON COLUMN public.ordens_servico.problema_constatado IS 'Problema constatado após análise técnica';
COMMENT ON COLUMN public.ordens_servico.servico_executado IS 'Descrição do serviço executado (ex.: troca de tela, troca de bateria, etc.)';
COMMENT ON COLUMN public.ordens_servico.tecnico_id IS 'ID do técnico responsável pela resolução';
COMMENT ON COLUMN public.ordens_servico.tecnico_nome IS 'Nome do técnico responsável (denormalizado para performance)';

