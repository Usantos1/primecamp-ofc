-- ============================================
-- ADICIONAR COLUNA company_id NA TABELA users
-- ============================================
-- Execute este script se a coluna company_id não existir
-- ============================================

DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Verificar se tabela users existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Tabela users não existe!';
    END IF;
    
    -- Adicionar coluna company_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'users' AND column_name = 'company_id'
    ) THEN
        -- Adicionar coluna (permitindo NULL temporariamente)
        ALTER TABLE public.users ADD COLUMN company_id UUID;
        
        -- Definir valor padrão para usuários existentes (empresa admin)
        UPDATE public.users 
        SET company_id = admin_company_id 
        WHERE company_id IS NULL;
        
        -- Se a tabela companies existe, adicionar foreign key
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'companies'
        ) THEN
            ALTER TABLE public.users 
            ADD CONSTRAINT fk_users_company 
            FOREIGN KEY (company_id) REFERENCES public.companies(id);
            
            -- Tornar NOT NULL após popular
            ALTER TABLE public.users 
            ALTER COLUMN company_id SET NOT NULL;
        END IF;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_users_company_id 
        ON public.users(company_id);
        
        RAISE NOTICE '✅ Coluna company_id adicionada em users com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️  Coluna company_id já existe em users';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'company_id';
