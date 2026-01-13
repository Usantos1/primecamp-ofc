-- ============================================================
-- VERIFICAR PERMISSÕES COM DESCRIÇÕES OU RECURSOS SIMILARES
-- Identifica permissões que podem parecer duplicadas na interface
-- ============================================================

-- 1. PERMISSÕES COM DESCRIÇÕES IDÊNTICAS (mas resource.action diferentes)
SELECT 
    'DESCRIÇÕES IDÊNTICAS' as tipo,
    description,
    COUNT(*) as quantidade,
    STRING_AGG(resource || '.' || action, ', ' ORDER BY resource, action) as resource_action,
    STRING_AGG(category, ' | ') as categorias,
    STRING_AGG(id::text, ', ') as ids
FROM permissions
WHERE description IS NOT NULL
GROUP BY description
HAVING COUNT(*) > 1
ORDER BY quantidade DESC, description;

-- 2. PERMISSÕES COM RECURSOS SIMILARES (clients vs clientes, produtos vs produtos)
SELECT 
    'RECURSOS SIMILARES' as tipo,
    LOWER(resource) as resource_normalizado,
    COUNT(DISTINCT resource) as variacoes,
    STRING_AGG(DISTINCT resource, ', ' ORDER BY resource) as recursos,
    STRING_AGG(DISTINCT action, ', ' ORDER BY action) as actions,
    STRING_AGG(DISTINCT category, ' | ' ORDER BY category) as categorias,
    COUNT(*) as total_permissoes
FROM permissions
GROUP BY LOWER(resource)
HAVING COUNT(DISTINCT resource) > 1
ORDER BY variacoes DESC;

-- 3. PERMISSÕES COM MESMA AÇÃO E DESCRIÇÃO SIMILAR (singular vs plural)
SELECT 
    'SINGULAR VS PLURAL' as tipo,
    p1.id as id1,
    p1.resource as res1,
    p1.action as act1,
    p1.description as desc1,
    p1.category as cat1,
    p2.id as id2,
    p2.resource as res2,
    p2.action as act2,
    p2.description as desc2,
    p2.category as cat2
FROM permissions p1
JOIN permissions p2 ON p1.id < p2.id
WHERE (
    -- Mesma ação
    p1.action = p2.action
    AND (
        -- Recursos similares (singular/plural)
        (LOWER(p1.resource) = LOWER(p2.resource) || 's')
        OR (LOWER(p2.resource) = LOWER(p1.resource) || 's')
        OR (LOWER(p1.resource) || 's' = LOWER(p2.resource))
        OR (LOWER(p2.resource) || 's' = LOWER(p1.resource))
        -- Ou descrições muito similares
        OR (
            LOWER(TRIM(p1.description)) LIKE LOWER(TRIM(p2.description)) || '%'
            OR LOWER(TRIM(p2.description)) LIKE LOWER(TRIM(p1.description)) || '%'
        )
    )
)
ORDER BY p1.resource, p1.action;

-- 4. LISTAR TODAS AS PERMISSÕES POR CATEGORIA (para ver duplicatas visuais)
SELECT 
    category as categoria,
    resource || '.' || action as resource_action,
    description,
    id,
    created_at
FROM permissions
ORDER BY category, resource, action, created_at;

-- 5. VERIFICAR SE HÁ PERMISSÕES COM MESMO resource.action MAS CATEGORIAS DIFERENTES
-- (Isso não deveria acontecer após a limpeza, mas vamos verificar)
SELECT 
    'MESMO RESOURCE.ACTION, CATEGORIAS DIFERENTES' as tipo,
    resource,
    action,
    COUNT(DISTINCT category) as categorias_diferentes,
    STRING_AGG(DISTINCT category, ' | ') as categorias,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids
FROM permissions
GROUP BY resource, action
HAVING COUNT(DISTINCT category) > 1
ORDER BY resource, action;
