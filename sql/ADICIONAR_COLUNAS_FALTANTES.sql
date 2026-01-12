-- Script para adicionar colunas faltantes que estão causando erros no backend

-- 1. Adicionar coluna sale_origin na tabela sales (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'sale_origin'
    ) THEN
        ALTER TABLE public.sales 
        ADD COLUMN sale_origin VARCHAR(50) DEFAULT 'PDV';
        
        -- Atualizar registros existentes baseado em alguma lógica (ajuste conforme necessário)
        -- Se não houver lógica específica, todos ficam como 'PDV' (padrão)
        
        COMMENT ON COLUMN public.sales.sale_origin IS 'Origem da venda: PDV, OS, ONLINE, etc.';
        
        RAISE NOTICE 'Coluna sale_origin adicionada à tabela sales';
    ELSE
        RAISE NOTICE 'Coluna sale_origin já existe na tabela sales';
    END IF;
END $$;

-- 2. Adicionar coluna technician_id na tabela ordens_servico (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ordens_servico' 
        AND column_name = 'technician_id'
    ) THEN
        ALTER TABLE public.ordens_servico 
        ADD COLUMN technician_id UUID;
        
        COMMENT ON COLUMN public.ordens_servico.technician_id IS 'ID do técnico responsável pela ordem de serviço';
        
        RAISE NOTICE 'Coluna technician_id adicionada à tabela ordens_servico';
    ELSE
        RAISE NOTICE 'Coluna technician_id já existe na tabela ordens_servico';
    END IF;
END $$;

-- 3. Criar tabela vendas_snapshot_diario (se não existir)
CREATE TABLE IF NOT EXISTS public.vendas_snapshot_diario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL UNIQUE,
    total_pdv NUMERIC(15,2) DEFAULT 0,
    total_os NUMERIC(15,2) DEFAULT 0,
    total_geral NUMERIC(15,2) DEFAULT 0,
    quantidade_pdv INTEGER DEFAULT 0,
    quantidade_os INTEGER DEFAULT 0,
    ticket_medio_pdv NUMERIC(15,2) DEFAULT 0,
    ticket_medio_os NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_snapshot_diario_data ON public.vendas_snapshot_diario(data);
CREATE INDEX IF NOT EXISTS idx_vendas_snapshot_diario_created_at ON public.vendas_snapshot_diario(created_at);

COMMENT ON TABLE public.vendas_snapshot_diario IS 'Snapshot diário de vendas para análises e relatórios';
COMMENT ON COLUMN public.vendas_snapshot_diario.data IS 'Data do snapshot (única por dia)';
COMMENT ON COLUMN public.vendas_snapshot_diario.total_pdv IS 'Total de vendas do PDV no dia';
COMMENT ON COLUMN public.vendas_snapshot_diario.total_os IS 'Total de vendas de OS no dia';
COMMENT ON COLUMN public.vendas_snapshot_diario.total_geral IS 'Total geral de vendas no dia';

-- 4. Criar tabela ia_recomendacoes (se não existir)
CREATE TABLE IF NOT EXISTS public.ia_recomendacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    prioridade INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pendente',
    dados JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID,
    CONSTRAINT fk_ia_recomendacoes_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ia_recomendacoes_status ON public.ia_recomendacoes(status);
CREATE INDEX IF NOT EXISTS idx_ia_recomendacoes_tipo ON public.ia_recomendacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_ia_recomendacoes_prioridade ON public.ia_recomendacoes(prioridade DESC);
CREATE INDEX IF NOT EXISTS idx_ia_recomendacoes_company_id ON public.ia_recomendacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_ia_recomendacoes_created_at ON public.ia_recomendacoes(created_at DESC);

COMMENT ON TABLE public.ia_recomendacoes IS 'Recomendações geradas por IA para o sistema financeiro';
COMMENT ON COLUMN public.ia_recomendacoes.tipo IS 'Tipo de recomendação: estoque, preco, vendas, etc.';
COMMENT ON COLUMN public.ia_recomendacoes.prioridade IS 'Prioridade de 1 a 10 (10 = mais alta)';
COMMENT ON COLUMN public.ia_recomendacoes.status IS 'Status: pendente, aplicada, descartada';
COMMENT ON COLUMN public.ia_recomendacoes.dados IS 'Dados adicionais em formato JSON';

RAISE NOTICE 'Script concluído: Colunas e tabelas faltantes foram criadas/adicionadas';
