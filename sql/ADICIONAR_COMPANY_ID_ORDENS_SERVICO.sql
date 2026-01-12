-- ============================================
-- ADICIONAR COLUNA company_id NA TABELA ordens_servico
-- ============================================

DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Verificar se tabela ordens_servico existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ordens_servico'
    ) THEN
        RAISE NOTICE 'Tabela ordens_servico não existe, pulando...';
        RETURN;
    END IF;
    
    -- Adicionar coluna company_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'ordens_servico' AND column_name = 'company_id'
    ) THEN
        -- Adicionar coluna (permitindo NULL temporariamente)
        ALTER TABLE public.ordens_servico ADD COLUMN company_id UUID;
        
        -- Definir valor padrão para registros existentes
        UPDATE public.ordens_servico 
        SET company_id = admin_company_id 
        WHERE company_id IS NULL;
        
        -- Se a tabela companies existe, adicionar foreign key
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'companies'
        ) THEN
            ALTER TABLE public.ordens_servico 
            ADD CONSTRAINT fk_ordens_servico_company 
            FOREIGN KEY (company_id) REFERENCES public.companies(id);
        END IF;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_ordens_servico_company_id 
        ON public.ordens_servico(company_id);
        
        RAISE NOTICE '✅ Coluna company_id adicionada em ordens_servico com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️  Coluna company_id já existe em ordens_servico';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ordens_servico' 
AND column_name = 'company_id';
