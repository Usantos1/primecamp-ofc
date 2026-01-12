-- Script para corrigir colunas das tabelas criadas anteriormente
-- Execute este script APÓS executar ADICIONAR_COLUNAS_FALTANTES.sql

-- 1. Corrigir colunas da tabela vendas_snapshot_diario
DO $$
BEGIN
    -- Renomear quantidade_pdv para quantidade_vendas_pdv se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vendas_snapshot_diario' 
        AND column_name = 'quantidade_pdv'
    ) THEN
        ALTER TABLE public.vendas_snapshot_diario 
        RENAME COLUMN quantidade_pdv TO quantidade_vendas_pdv;
        RAISE NOTICE 'Coluna quantidade_pdv renomeada para quantidade_vendas_pdv';
    END IF;
    
    -- Renomear quantidade_os para quantidade_vendas_os se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vendas_snapshot_diario' 
        AND column_name = 'quantidade_os'
    ) THEN
        ALTER TABLE public.vendas_snapshot_diario 
        RENAME COLUMN quantidade_os TO quantidade_vendas_os;
        RAISE NOTICE 'Coluna quantidade_os renomeada para quantidade_vendas_os';
    END IF;
    
    -- Adicionar quantidade_vendas_pdv se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vendas_snapshot_diario' 
        AND column_name = 'quantidade_vendas_pdv'
    ) THEN
        ALTER TABLE public.vendas_snapshot_diario 
        ADD COLUMN quantidade_vendas_pdv INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna quantidade_vendas_pdv adicionada';
    END IF;
    
    -- Adicionar quantidade_vendas_os se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vendas_snapshot_diario' 
        AND column_name = 'quantidade_vendas_os'
    ) THEN
        ALTER TABLE public.vendas_snapshot_diario 
        ADD COLUMN quantidade_vendas_os INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna quantidade_vendas_os adicionada';
    END IF;
END $$;

-- 2. Adicionar coluna referencia_id na tabela ia_recomendacoes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ia_recomendacoes' 
        AND column_name = 'referencia_id'
    ) THEN
        ALTER TABLE public.ia_recomendacoes 
        ADD COLUMN referencia_id UUID;
        
        CREATE INDEX IF NOT EXISTS idx_ia_recomendacoes_referencia_id ON public.ia_recomendacoes(referencia_id);
        
        COMMENT ON COLUMN public.ia_recomendacoes.referencia_id IS 'ID de referência (ex: produto_id para recomendações de estoque)';
        
        RAISE NOTICE 'Coluna referencia_id adicionada à tabela ia_recomendacoes';
    ELSE
        RAISE NOTICE 'Coluna referencia_id já existe na tabela ia_recomendacoes';
    END IF;
END $$;

-- Script concluído
