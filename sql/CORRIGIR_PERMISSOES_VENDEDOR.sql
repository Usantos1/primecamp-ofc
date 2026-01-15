-- ============================================
-- CORRIGIR PERMISSÕES DE VENDEDOR
-- Adicionar nps.view e garantir rh.ponto para vendedor
-- ============================================

-- 0. DIAGNÓSTICO: Verificar roles existentes
SELECT '=== ROLES EXISTENTES ===' as info;
SELECT id, name, display_name, is_system 
FROM roles 
WHERE LOWER(name) LIKE '%vendedor%' OR LOWER(name) LIKE '%sales%' OR LOWER(name) LIKE '%venda%'
ORDER BY name;

-- 1. Criar/verificar permissões e associar ao role vendedor
DO $$
DECLARE
    v_permission_id UUID;
    v_role_id UUID;
    v_role_name TEXT;
    v_nps_permission_id UUID;
    v_ponto_permission_id UUID;
BEGIN
    -- Buscar role vendedor (tentar variações)
    SELECT id, name INTO v_role_id, v_role_name
    FROM roles
    WHERE LOWER(name) IN ('vendedor', 'sales', 'vendas', 'vendedores')
    LIMIT 1;

    IF v_role_id IS NULL THEN
        RAISE NOTICE '❌ Role vendedor não encontrado! Verifique os roles acima.';
        RAISE EXCEPTION 'Role vendedor não encontrado. Execute a query de diagnóstico primeiro.';
    END IF;

    RAISE NOTICE '✅ Role encontrado: % (ID: %)', v_role_name, v_role_id;

    -- ========== PERMISSÃO NPS.VIEW ==========
    SELECT id INTO v_nps_permission_id
    FROM permissions
    WHERE resource = 'nps' AND action = 'view'
    LIMIT 1;

    IF v_nps_permission_id IS NULL THEN
        INSERT INTO permissions (resource, action, description, category)
        VALUES ('nps', 'view', 'Visualizar e responder pesquisas NPS', 'gestao')
        RETURNING id INTO v_nps_permission_id;
        RAISE NOTICE '✅ Permissão nps.view criada com ID: %', v_nps_permission_id;
    ELSE
        RAISE NOTICE 'ℹ️ Permissão nps.view já existe com ID: %', v_nps_permission_id;
    END IF;

    -- Associar nps.view ao role
    IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role_id = v_role_id AND permission_id = v_nps_permission_id
    ) THEN
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (v_role_id, v_nps_permission_id);
        RAISE NOTICE '✅ Permissão nps.view adicionada ao role %', v_role_name;
    ELSE
        RAISE NOTICE 'ℹ️ Permissão nps.view já está associada ao role %', v_role_name;
    END IF;

    -- ========== PERMISSÃO RH.PONTO ==========
    SELECT id INTO v_ponto_permission_id
    FROM permissions
    WHERE resource = 'rh' AND action = 'ponto'
    LIMIT 1;

    IF v_ponto_permission_id IS NULL THEN
        INSERT INTO permissions (resource, action, description, category)
        VALUES ('rh', 'ponto', 'Acessar ponto eletrônico', 'gestao')
        RETURNING id INTO v_ponto_permission_id;
        RAISE NOTICE '✅ Permissão rh.ponto criada com ID: %', v_ponto_permission_id;
    ELSE
        RAISE NOTICE 'ℹ️ Permissão rh.ponto já existe com ID: %', v_ponto_permission_id;
    END IF;

    -- Associar rh.ponto ao role
    IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role_id = v_role_id AND permission_id = v_ponto_permission_id
    ) THEN
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (v_role_id, v_ponto_permission_id);
        RAISE NOTICE '✅ Permissão rh.ponto adicionada ao role %', v_role_name;
    ELSE
        RAISE NOTICE 'ℹ️ Permissão rh.ponto já está associada ao role %', v_role_name;
    END IF;

    -- Commit explícito
    COMMIT;

    RAISE NOTICE '✅ Processo concluído com sucesso!';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro: %', SQLERRM;
    ROLLBACK;
END $$;

-- 2. Verificar permissões atuais do vendedor
SELECT '=== PERMISSÕES DO VENDEDOR ===' as info;
SELECT 
    r.name as role_name,
    r.display_name,
    p.resource,
    p.action,
    p.description,
    p.category
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE LOWER(r.name) IN ('vendedor', 'sales', 'vendas', 'vendedores')
ORDER BY r.name, p.resource, p.action;

-- 3. Verificar se as permissões específicas estão presentes
SELECT '=== VERIFICAÇÃO ESPECÍFICA ===' as info;
SELECT 
    r.name as role_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM role_permissions rp2
            JOIN permissions p2 ON rp2.permission_id = p2.id
            WHERE rp2.role_id = r.id AND p2.resource = 'nps' AND p2.action = 'view'
        ) THEN '✅ SIM' 
        ELSE '❌ NÃO' 
    END as tem_nps_view,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM role_permissions rp2
            JOIN permissions p2 ON rp2.permission_id = p2.id
            WHERE rp2.role_id = r.id AND p2.resource = 'rh' AND p2.action = 'ponto'
        ) THEN '✅ SIM' 
        ELSE '❌ NÃO' 
    END as tem_rh_ponto
FROM roles r
WHERE LOWER(r.name) IN ('vendedor', 'sales', 'vendas', 'vendedores');
