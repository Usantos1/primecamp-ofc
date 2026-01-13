-- ============================================
-- VERIFICAR E CORRIGIR PROBLEMA DE cashier_user_id
-- ============================================

-- 1. VERIFICAR SE O USUÁRIO EXISTE EM public.users
SELECT 
    'VERIFICAR USUÁRIO' as tipo,
    '483dec5a-7709-4a6a-b71f-b5231d33a2fc' as user_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = '483dec5a-7709-4a6a-b71f-b5231d33a2fc'
        ) THEN '✅ EXISTE em public.users'
        ELSE '❌ NÃO EXISTE em public.users'
    END as status;

-- 2. LISTAR TODOS OS USUÁRIOS EM public.users
SELECT 
    id,
    email,
    created_at,
    company_id
FROM public.users
ORDER BY created_at DESC
LIMIT 20;

-- 3. VERIFICAR FOREIGN KEY CONSTRAINT
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'sales'
    AND kcu.column_name = 'cashier_user_id';

-- 4. VERIFICAR VENDAS COM cashier_user_id INVÁLIDO
SELECT 
    s.id,
    s.numero,
    s.cashier_user_id,
    s.created_at,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ Usuário existe'
        ELSE '❌ Usuário NÃO existe'
    END as status_usuario
FROM public.sales s
LEFT JOIN public.users u ON s.cashier_user_id = u.id
WHERE s.cashier_user_id IS NOT NULL
ORDER BY s.created_at DESC
LIMIT 20;

-- 5. CORRIGIR: CRIAR USUÁRIO SE NÃO EXISTIR (DESCOMENTE PARA EXECUTAR)
/*
DO $$ 
DECLARE
    user_id UUID := '483dec5a-7709-4a6a-b71f-b5231d33a2fc';
    user_email TEXT;
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Verificar se usuário existe em auth.users (Supabase Auth)
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário com ID % não existe em auth.users. Verifique o ID.', user_id;
    END IF;
    
    -- Verificar se usuário existe em public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
        -- Criar usuário em public.users
        INSERT INTO public.users (id, email, company_id, created_at)
        VALUES (user_id, user_email, admin_company_id, NOW())
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✅ Usuário % criado em public.users com email %', user_id, user_email;
    ELSE
        RAISE NOTICE '✅ Usuário % já existe em public.users', user_id;
    END IF;
END $$;
*/

-- 6. ALTERNATIVA: TORNAR cashier_user_id NULLABLE E REMOVER CONSTRAINT (NÃO RECOMENDADO)
-- Isso permitiria vendas sem cashier_user_id, mas não é ideal para rastreabilidade
/*
ALTER TABLE public.sales 
ALTER COLUMN cashier_user_id DROP NOT NULL;

-- OU remover a constraint completamente (NÃO RECOMENDADO):
-- ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_cashier_user_id_fkey;
*/
