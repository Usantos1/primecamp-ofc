-- ============================================
-- CORRIGIR PERMISSÕES DE VENDEDOR
-- Adicionar nps.view e garantir rh.ponto para vendedor
-- ============================================

-- 1. Verificar se a permissão nps.view existe
DO $$
DECLARE
    v_permission_id UUID;
    v_role_id UUID;
BEGIN
    -- Buscar ou criar permissão nps.view
    SELECT id INTO v_permission_id
    FROM permissions
    WHERE resource = 'nps' AND action = 'view'
    LIMIT 1;

    IF v_permission_id IS NULL THEN
        -- Criar permissão nps.view se não existir
        INSERT INTO permissions (resource, action, description, category)
        VALUES ('nps', 'view', 'Visualizar e responder pesquisas NPS', 'gestao')
        RETURNING id INTO v_permission_id;
        
        RAISE NOTICE 'Permissão nps.view criada com ID: %', v_permission_id;
    ELSE
        RAISE NOTICE 'Permissão nps.view já existe com ID: %', v_permission_id;
    END IF;

    -- Buscar role vendedor
    SELECT id INTO v_role_id
    FROM roles
    WHERE LOWER(name) = 'vendedor'
    LIMIT 1;

    IF v_role_id IS NULL THEN
        RAISE NOTICE 'Role vendedor não encontrado!';
        RETURN;
    END IF;

    -- Verificar se a permissão já está associada ao role
    IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role_id = v_role_id AND permission_id = v_permission_id
    ) THEN
        -- Adicionar permissão nps.view ao role vendedor
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (v_role_id, v_permission_id);
        
        RAISE NOTICE 'Permissão nps.view adicionada ao role vendedor';
    ELSE
        RAISE NOTICE 'Permissão nps.view já está associada ao role vendedor';
    END IF;

    -- Garantir que rh.ponto está associado ao vendedor
    -- Buscar ou criar permissão rh.ponto
    SELECT id INTO v_permission_id
    FROM permissions
    WHERE resource = 'rh' AND action = 'ponto'
    LIMIT 1;

    IF v_permission_id IS NULL THEN
        -- Criar permissão rh.ponto se não existir
        INSERT INTO permissions (resource, action, description, category)
        VALUES ('rh', 'ponto', 'Acessar ponto eletrônico', 'gestao')
        RETURNING id INTO v_permission_id;
        
        RAISE NOTICE 'Permissão rh.ponto criada com ID: %', v_permission_id;
    ELSE
        RAISE NOTICE 'Permissão rh.ponto já existe com ID: %', v_permission_id;
    END IF;

    -- Associar permissão rh.ponto ao role vendedor
    IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role_id = v_role_id AND permission_id = v_permission_id
    ) THEN
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (v_role_id, v_permission_id);
        
        RAISE NOTICE 'Permissão rh.ponto adicionada ao role vendedor';
    ELSE
        RAISE NOTICE 'Permissão rh.ponto já está associada ao role vendedor';
    END IF;

END $$;

-- 2. Verificar permissões atuais do vendedor
SELECT 
    r.name as role_name,
    p.resource,
    p.action,
    p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE LOWER(r.name) = 'vendedor'
ORDER BY p.resource, p.action;
