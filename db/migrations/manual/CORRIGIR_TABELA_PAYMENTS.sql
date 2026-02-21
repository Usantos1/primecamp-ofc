-- =====================================================
-- CORRIGIR TABELA PAYMENTS
-- Adiciona colunas faltantes se a tabela já existir
-- =====================================================

DO $$
BEGIN
    -- Verificar se tabela payments existe
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'payments') THEN
        
        -- Adicionar updated_at se não existir (antes de qualquer UPDATE)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'payments' 
                       AND column_name = 'updated_at') THEN
            ALTER TABLE public.payments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Coluna updated_at adicionada em payments';
        END IF;
        
        -- Remover trigger antigo se existir (pode estar causando problema)
        DROP TRIGGER IF EXISTS set_updated_at_payments ON public.payments;
        
        -- Adicionar company_id se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'payments' 
                       AND column_name = 'company_id') THEN
            ALTER TABLE public.payments ADD COLUMN company_id UUID;
            
            -- Se houver registros, associar à empresa admin
            UPDATE public.payments 
            SET company_id = '00000000-0000-0000-0000-000000000001'::UUID 
            WHERE company_id IS NULL;
            
            -- Adicionar foreign key
            ALTER TABLE public.payments 
            ADD CONSTRAINT fk_payments_company 
            FOREIGN KEY (company_id) REFERENCES public.companies(id);
            
            -- Tornar NOT NULL
            ALTER TABLE public.payments ALTER COLUMN company_id SET NOT NULL;
            
            RAISE NOTICE 'Coluna company_id adicionada em payments';
        END IF;
        
        -- Adicionar external_id se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'payments' 
                       AND column_name = 'external_id') THEN
            ALTER TABLE public.payments ADD COLUMN external_id VARCHAR(255);
            RAISE NOTICE 'Coluna external_id adicionada em payments';
        END IF;
        
        -- Criar índices se não existirem
        IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                       WHERE schemaname = 'public' 
                       AND tablename = 'payments' 
                       AND indexname = 'idx_payments_company_id') THEN
            CREATE INDEX idx_payments_company_id ON public.payments(company_id);
            RAISE NOTICE 'Índice idx_payments_company_id criado';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                       WHERE schemaname = 'public' 
                       AND tablename = 'payments' 
                       AND indexname = 'idx_payments_external_id') THEN
            CREATE INDEX idx_payments_external_id ON public.payments(external_id);
            RAISE NOTICE 'Índice idx_payments_external_id criado';
        END IF;
        
        -- Recriar trigger updated_at agora que a coluna existe
        CREATE TRIGGER set_updated_at_payments
            BEFORE UPDATE ON public.payments
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela payments corrigida com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela payments não existe';
    END IF;
END $$;

SELECT 'Correção da tabela payments concluída!' AS resultado;

