-- ============================================
-- VERIFICAR FOREIGN KEY CONSTRAINT DE cashier_user_id
-- ============================================

-- 1. VERIFICAR A CONSTRAINT
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'sales'
    AND kcu.column_name = 'cashier_user_id';

-- 2. VERIFICAR SE O USUÁRIO EXISTE EM public.users
SELECT 
    'public.users' as tabela,
    id,
    email,
    company_id,
    created_at,
    '✅ EXISTE' as status
FROM public.users
WHERE id = '483dec5a-7709-4a6a-b71f-b5231d33a2fc';

-- 3. VERIFICAR SE O USUÁRIO EXISTE EM auth.users (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Tabela auth.users existe';
    ELSE
        RAISE NOTICE 'Tabela auth.users NÃO existe';
    END IF;
END $$;

-- Se auth.users existir, executar:
SELECT 
    'auth.users' as tabela,
    id,
    email,
    created_at,
    '✅ EXISTE' as status
FROM auth.users
WHERE id = '483dec5a-7709-4a6a-b71f-b5231d33a2fc';

-- 4. VERIFICAR A DEFINIÇÃO COMPLETA DA CONSTRAINT
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.sales'::regclass
    AND conname = 'sales_cashier_user_id_fkey';

-- 5. VERIFICAR TODAS AS CONSTRAINTS DA TABELA sales
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.sales'::regclass
    AND conname LIKE '%cashier%'
ORDER BY conname;
