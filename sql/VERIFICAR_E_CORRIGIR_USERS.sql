-- ============================================
-- VERIFICAR E CORRIGIR USUÁRIOS SEM company_id
-- ============================================
-- Este script verifica usuários sem company_id
-- e os corrige atribuindo à empresa admin padrão
-- ============================================

-- 1. VERIFICAR STATUS ATUAL
-- ============================================
SELECT 
    'Status dos usuários' as tipo,
    COUNT(*) as total,
    COUNT(company_id) as com_company_id,
    COUNT(*) - COUNT(company_id) as sem_company_id
FROM public.users;

-- 2. LISTAR USUÁRIOS SEM company_id
-- ============================================
SELECT 
    id,
    email,
    company_id,
    created_at,
    CASE 
        WHEN company_id IS NULL THEN '❌ SEM company_id'
        ELSE '✅ TEM company_id'
    END as status
FROM public.users
ORDER BY 
    CASE WHEN company_id IS NULL THEN 0 ELSE 1 END,
    email;

-- 3. VERIFICAR SE A EMPRESA ADMIN EXISTE
-- ============================================
SELECT 
    'Empresa Admin' as tipo,
    id,
    name,
    CASE 
        WHEN id = '00000000-0000-0000-0000-000000000001' THEN '✅ Empresa Admin existe'
        ELSE '⚠️ Empresa diferente'
    END as status
FROM public.companies
WHERE id = '00000000-0000-0000-0000-000000000001'
LIMIT 1;

-- 4. CORRIGIR USUÁRIOS SEM company_id
-- ============================================
-- ⚠️ ATENÇÃO: Execute apenas se quiser corrigir automaticamente
-- Descomente as linhas abaixo para executar a correção:

/*
DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
    users_updated INTEGER;
BEGIN
    -- Verificar se empresa admin existe
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = admin_company_id) THEN
        RAISE EXCEPTION 'Empresa admin não encontrada! Execute primeiro CRIAR_SISTEMA_REVENDA.sql ou crie a empresa admin manualmente.';
    END IF;
    
    -- Atualizar usuários sem company_id
    UPDATE public.users 
    SET company_id = admin_company_id 
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS users_updated = ROW_COUNT;
    
    RAISE NOTICE '✅ % usuário(s) atualizado(s) com company_id = %', users_updated, admin_company_id;
END $$;
*/

-- 5. VERIFICAR RESULTADO FINAL
-- ============================================
SELECT 
    'Resultado Final' as tipo,
    COUNT(*) as total_usuarios,
    COUNT(company_id) as com_company_id,
    COUNT(*) - COUNT(company_id) as sem_company_id,
    COUNT(DISTINCT company_id) as empresas_distintas
FROM public.users;

-- 6. LISTAR TODOS OS USUÁRIOS COM SUA EMPRESA
-- ============================================
SELECT 
    u.id,
    u.email,
    u.company_id,
    c.name as empresa_nome,
    u.created_at,
    CASE 
        WHEN u.company_id IS NULL THEN '❌ SEM company_id'
        WHEN u.company_id = '00000000-0000-0000-0000-000000000001' THEN '✅ Empresa Admin'
        WHEN c.id IS NOT NULL THEN '✅ Empresa: ' || c.name
        ELSE '⚠️ Empresa não encontrada'
    END as status
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
ORDER BY u.created_at DESC;
