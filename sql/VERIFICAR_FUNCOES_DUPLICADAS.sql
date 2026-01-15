-- ============================================================
-- VERIFICAR FUNÇÕES (ROLES) DUPLICADAS
-- ============================================================
-- Este script identifica funções com nomes duplicados

-- 1. LISTAR TODAS AS FUNÇÕES COM CONTAGEM
SELECT 
    name,
    display_name,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ' ORDER BY created_at) as ids,
    STRING_AGG(description, ' | ' ORDER BY created_at) as descricoes
FROM roles
GROUP BY name, display_name
HAVING COUNT(*) > 1
ORDER BY name;

-- 2. DETALHAR FUNÇÕES DUPLICADAS
SELECT 
    r.id,
    r.name,
    r.display_name,
    r.description,
    r.is_system,
    r.created_at,
    r.updated_at,
    (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as total_permissoes
FROM roles r
WHERE r.name IN (
    SELECT name 
    FROM roles 
    GROUP BY name 
    HAVING COUNT(*) > 1
)
ORDER BY r.name, r.created_at;

-- 3. VERIFICAR SE HÁ PERMISSÕES ASSOCIADAS
SELECT 
    r.id,
    r.name,
    r.display_name,
    COUNT(rp.permission_id) as total_permissoes,
    STRING_AGG(p.resource || '.' || p.action, ', ' ORDER BY p.resource, p.action) as permissoes
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
WHERE r.name IN (
    SELECT name 
    FROM roles 
    GROUP BY name 
    HAVING COUNT(*) > 1
)
GROUP BY r.id, r.name, r.display_name
ORDER BY r.name, r.created_at;

-- 4. VERIFICAR SE HÁ USUÁRIOS ASSOCIADAS A ESTAS FUNÇÕES
SELECT 
    r.id,
    r.name,
    r.display_name,
    COUNT(DISTINCT p.user_id) as usuarios_associados,
    STRING_AGG(DISTINCT u.email, ', ') as emails_usuarios
FROM roles r
LEFT JOIN profiles p ON p.role = r.name
LEFT JOIN users u ON u.id = p.user_id
WHERE r.name IN (
    SELECT name 
    FROM roles 
    GROUP BY name 
    HAVING COUNT(*) > 1
)
GROUP BY r.id, r.name, r.display_name
ORDER BY r.name, r.created_at;
