-- ============================================
-- CRIAR USUÁRIO EM public.users PARA CORRIGIR cashier_user_id
-- ============================================
-- Execute este script para criar o usuário que está faltando
-- ============================================

DO $$ 
DECLARE
    user_id UUID := '483dec5a-7709-4a6a-b71f-b5231d33a2fc';
    user_email TEXT;
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Verificar se usuário já existe
    IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
        RAISE NOTICE '✅ Usuário % já existe em public.users', user_id;
        RETURN;
    END IF;
    
    -- Tentar buscar email do usuário em auth.users (se existir)
    BEGIN
        SELECT email INTO user_email 
        FROM auth.users 
        WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
        -- Se auth.users não existir ou der erro, usar email padrão
        user_email := 'user-' || SUBSTRING(user_id::TEXT, 1, 8) || '@primecamp.local';
    END;
    
    -- Se não encontrou email, usar padrão
    IF user_email IS NULL THEN
        user_email := 'user-' || SUBSTRING(user_id::TEXT, 1, 8) || '@primecamp.local';
    END IF;
    
    -- Verificar se empresa admin existe
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = admin_company_id) THEN
        RAISE EXCEPTION 'Empresa admin não encontrada! Execute primeiro CRIAR_SISTEMA_REVENDA.sql';
    END IF;
    
    -- Criar usuário em public.users
    INSERT INTO public.users (id, email, company_id, created_at)
    VALUES (user_id, user_email, admin_company_id, NOW())
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Usuário % criado em public.users com email % e company_id %', user_id, user_email, admin_company_id;
END $$;

-- Verificar resultado
SELECT 
    id,
    email,
    company_id,
    created_at,
    '✅ CRIADO' as status
FROM public.users
WHERE id = '483dec5a-7709-4a6a-b71f-b5231d33a2fc';
