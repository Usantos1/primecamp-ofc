-- ============================================
-- CORRIGIR USUÁRIOS SEM company_id
-- ============================================
-- Este script atribui company_id aos usuários sem company_id
-- ============================================

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

-- Verificar resultado
SELECT 
    'Resultado' as tipo,
    COUNT(*) as total_usuarios,
    COUNT(company_id) as com_company_id,
    COUNT(*) - COUNT(company_id) as sem_company_id
FROM public.users;
