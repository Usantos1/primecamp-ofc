-- ============================================================
-- VERIFICAR PERMISSÕES DUPLICADAS E CATEGORIAS CONFUSAS
-- ============================================================

-- 1. LISTAR TODAS AS CATEGORIAS COM CONTAGEM
SELECT 
    category,
    COUNT(*) as total_permissoes,
    STRING_AGG(resource || '.' || action, ', ' ORDER BY resource, action) as permissoes
FROM permissions
GROUP BY category
ORDER BY category;

-- 2. VERIFICAR PERMISSÕES DUPLICADAS (mesmo resource.action)
SELECT 
    resource,
    action,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids,
    STRING_AGG(category, ' | ') as categorias,
    STRING_AGG(description, ' | ') as descricoes
FROM permissions
GROUP BY resource, action
HAVING COUNT(*) > 1
ORDER BY resource, action;

-- 3. VERIFICAR CATEGORIAS COM NOMES SIMILARES
SELECT 
    category,
    COUNT(*) as total,
    STRING_AGG(DISTINCT resource, ', ' ORDER BY resource) as resources_unicos
FROM permissions
WHERE category LIKE '%cliente%' 
   OR category LIKE '%pdv%'
   OR category LIKE '%produto%'
   OR category LIKE '%venda%'
GROUP BY category
ORDER BY category;

-- 4. LISTAR TODAS AS PERMISSÕES POR CATEGORIA COM DETALHES
SELECT 
    category,
    resource,
    action,
    description,
    id
FROM permissions
ORDER BY category, resource, action;

-- 5. VERIFICAR PERMISSÕES COM DESCRIÇÕES SIMILARES
SELECT 
    p1.id as id1,
    p1.category as cat1,
    p1.resource as res1,
    p1.action as act1,
    p1.description as desc1,
    p2.id as id2,
    p2.category as cat2,
    p2.resource as res2,
    p2.action as act2,
    p2.description as desc2
FROM permissions p1
JOIN permissions p2 ON p1.id < p2.id
WHERE (
    (p1.resource = p2.resource AND p1.action = p2.action)
    OR (p1.description = p2.description AND p1.description IS NOT NULL)
    OR (p1.category = p2.category AND p1.resource = p2.resource AND p1.action = p2.action)
)
ORDER BY p1.category, p1.resource, p1.action;
