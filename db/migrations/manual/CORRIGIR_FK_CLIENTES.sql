-- =====================================================
-- CORRIGIR FOREIGN KEY NA TABELA CLIENTES
-- =====================================================
-- O erro: insert or update on table "clientes" violates foreign key constraint "clientes_created_by_fkey"
-- Causa: clientes.created_by referencia auth.users que não existe mais

-- 1. Remover a foreign key problemática
DO $$
BEGIN
    -- Remover clientes_created_by_fkey se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clientes_created_by_fkey' 
        AND table_name = 'clientes'
    ) THEN
        ALTER TABLE clientes DROP CONSTRAINT clientes_created_by_fkey;
        RAISE NOTICE 'Removido: clientes_created_by_fkey';
    END IF;
    
    -- Remover outras possíveis FKs para auth.users na tabela clientes
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clientes_updated_by_fkey' 
        AND table_name = 'clientes'
    ) THEN
        ALTER TABLE clientes DROP CONSTRAINT clientes_updated_by_fkey;
        RAISE NOTICE 'Removido: clientes_updated_by_fkey';
    END IF;
END $$;

-- 2. Verificar e remover FKs problemáticas em outras tabelas também
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_schema = 'auth' OR ccu.table_name = 'auth.users')
        AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
        RAISE NOTICE 'Removido: % de %', r.constraint_name, r.table_name;
    END LOOP;
END $$;

-- 3. Listar foreign keys restantes (para debug)
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'clientes';

-- Confirmação
SELECT 'Foreign key clientes_created_by_fkey removida com sucesso!' AS status;

