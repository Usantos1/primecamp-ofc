-- ============================================================
-- LIMPAR PERMISSÕES DUPLICADAS DE FORMA AGRESSIVA
-- Remove permissões duplicadas considerando variações (singular/plural)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. IDENTIFICAR PERMISSÕES DUPLICADAS POR RESOURCE.ACTION
-- ============================================================
-- Criar tabela temporária com permissões a manter (mais antiga de cada resource.action)
CREATE TEMP TABLE permissions_to_keep AS
SELECT DISTINCT ON (resource, action)
  id,
  resource,
  action,
  description,
  category,
  created_at
FROM permissions
ORDER BY resource, action, created_at ASC;

-- ============================================================
-- 2. IDENTIFICAR PERMISSÕES DUPLICADAS POR DESCRIÇÃO SIMILAR
-- ============================================================
-- Adicionar à lista de duplicatas: permissões com descrições muito similares
-- Ex: "Criar cliente" vs "Criar clientes", "Ver clientes" vs "Ver clientes"
CREATE TEMP TABLE permissions_duplicates_by_desc AS
SELECT 
  p1.id as id_to_delete,
  p2.id as id_to_keep
FROM permissions p1
JOIN permissions p2 ON p1.id < p2.id
WHERE (
  -- Mesma descrição (case-insensitive, ignorando espaços extras)
  LOWER(TRIM(p1.description)) = LOWER(TRIM(p2.description))
  OR
  -- Descrições muito similares (singular vs plural)
  (
    LOWER(TRIM(p1.description)) LIKE LOWER(TRIM(p2.description)) || '%'
    OR LOWER(TRIM(p2.description)) LIKE LOWER(TRIM(p1.description)) || '%'
  )
  AND (
    -- Mesmo resource (ou variação singular/plural)
    p1.resource = p2.resource
    OR LOWER(p1.resource) = LOWER(p2.resource)
    OR (
      (p1.resource LIKE p2.resource || 's' OR p2.resource LIKE p1.resource || 's')
      AND p1.action = p2.action
    )
  )
  AND p1.action = p2.action
)
-- Manter a mais antiga
AND p1.created_at >= p2.created_at;

-- ============================================================
-- 3. IDENTIFICAR PERMISSÕES COM MESMO RESOURCE.ACTION
-- ============================================================
CREATE TEMP TABLE permissions_duplicates_by_resource_action AS
SELECT 
  p1.id as id_to_delete,
  p2.id as id_to_keep
FROM permissions p1
JOIN permissions p2 ON p1.id < p2.id
WHERE p1.resource = p2.resource
  AND p1.action = p2.action
  AND p1.id != p2.id
-- Manter a mais antiga
AND p1.created_at >= p2.created_at;

-- ============================================================
-- 4. CONSOLIDAR TODAS AS DUPLICATAS
-- ============================================================
CREATE TEMP TABLE all_duplicates AS
SELECT DISTINCT id_to_delete
FROM (
  SELECT id_to_delete FROM permissions_duplicates_by_desc
  UNION
  SELECT id_to_delete FROM permissions_duplicates_by_resource_action
  UNION
  -- Adicionar permissões que não estão na lista de "manter"
  SELECT p.id as id_to_delete
  FROM permissions p
  WHERE NOT EXISTS (
    SELECT 1 FROM permissions_to_keep ptk WHERE ptk.id = p.id
  )
) AS all_dup;

-- ============================================================
-- 5. MAPEAMENTO DE CATEGORIAS (consolidar)
-- ============================================================
UPDATE permissions p
SET category = CASE
  WHEN LOWER(TRIM(category)) IN ('clientes', 'cliente') THEN 'clientes'
  WHEN LOWER(TRIM(category)) IN ('pdv', 'vendas', 'pdv - vendas') THEN 'pdv'
  WHEN LOWER(TRIM(category)) IN ('assistência', 'assistência técnica', 'os', 'assistencia') THEN 'assistencia'
  WHEN LOWER(TRIM(category)) IN ('produtos', 'produto') THEN 'produtos'
  WHEN LOWER(TRIM(category)) IN ('admin', 'administração', 'administracao') THEN 'admin'
  WHEN LOWER(TRIM(category)) IN ('rh', 'recursos humanos', 'recursos_humanos') THEN 'rh'
  WHEN LOWER(TRIM(category)) IN ('gestão', 'gestao', 'geral') THEN 'gestao'
  WHEN LOWER(TRIM(category)) IN ('financeiro') THEN 'financeiro'
  WHEN LOWER(TRIM(category)) IN ('relatórios', 'relatorios', 'reports') THEN 'relatorios'
  WHEN LOWER(TRIM(category)) IN ('usuários', 'usuarios', 'users') THEN 'usuarios'
  ELSE LOWER(TRIM(category))
END
WHERE category IS NOT NULL;

-- ============================================================
-- 6. REMOVER PERMISSÕES DE ROLE_PERMISSIONS ANTES DE DELETAR
-- ============================================================
-- Mover role_permissions das duplicatas para a permissão mantida
WITH duplicate_mapping AS (
  SELECT DISTINCT ON (ad.id_to_delete)
    ad.id_to_delete,
    COALESCE(
      pdbd.id_to_keep,
      pdra.id_to_keep,
      (SELECT id FROM permissions_to_keep WHERE resource = p.resource AND action = p.action LIMIT 1)
    ) as id_to_keep
  FROM all_duplicates ad
  LEFT JOIN permissions p ON p.id = ad.id_to_delete
  LEFT JOIN permissions_duplicates_by_desc pdbd ON pdbd.id_to_delete = ad.id_to_delete
  LEFT JOIN permissions_duplicates_by_resource_action pdra ON pdra.id_to_delete = ad.id_to_delete
)
UPDATE role_permissions rp
SET permission_id = dm.id_to_keep
FROM duplicate_mapping dm
WHERE rp.permission_id = dm.id_to_delete
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp2 
    WHERE rp2.role_id = rp.role_id 
      AND rp2.permission_id = dm.id_to_keep
  );

-- Deletar role_permissions das duplicatas que não foram movidas
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id_to_delete FROM all_duplicates);

-- ============================================================
-- 7. REMOVER PERMISSÕES DE USER_PERMISSIONS ANTES DE DELETAR
-- ============================================================
-- Mover user_permissions das duplicatas para a permissão mantida
WITH duplicate_mapping AS (
  SELECT DISTINCT ON (ad.id_to_delete)
    ad.id_to_delete,
    COALESCE(
      pdbd.id_to_keep,
      pdra.id_to_keep,
      (SELECT id FROM permissions_to_keep WHERE resource = p.resource AND action = p.action LIMIT 1)
    ) as id_to_keep
  FROM all_duplicates ad
  LEFT JOIN permissions p ON p.id = ad.id_to_delete
  LEFT JOIN permissions_duplicates_by_desc pdbd ON pdbd.id_to_delete = ad.id_to_delete
  LEFT JOIN permissions_duplicates_by_resource_action pdra ON pdra.id_to_delete = ad.id_to_delete
)
UPDATE user_permissions up
SET permission_id = dm.id_to_keep
FROM duplicate_mapping dm
WHERE up.permission_id = dm.id_to_delete
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up2 
    WHERE up2.user_id = up.user_id 
      AND up2.permission_id = dm.id_to_keep
  );

-- Deletar user_permissions das duplicatas que não foram movidas
DELETE FROM user_permissions
WHERE permission_id IN (SELECT id_to_delete FROM all_duplicates);

-- ============================================================
-- 8. DELETAR PERMISSÕES DUPLICADAS
-- ============================================================
DELETE FROM permissions
WHERE id IN (SELECT id_to_delete FROM all_duplicates);

-- ============================================================
-- 9. LIMPAR TABELAS TEMPORÁRIAS
-- ============================================================
DROP TABLE IF EXISTS permissions_to_keep;
DROP TABLE IF EXISTS permissions_duplicates_by_desc;
DROP TABLE IF EXISTS permissions_duplicates_by_resource_action;
DROP TABLE IF EXISTS all_duplicates;

COMMIT;

-- ============================================================
-- 10. VERIFICAR RESULTADO
-- ============================================================
SELECT 
    'RESULTADO FINAL' as tipo,
    category as categoria,
    COUNT(*) as total_permissoes,
    STRING_AGG(resource || '.' || action || ' (' || description || ')', ', ' ORDER BY resource, action) as permissoes
FROM permissions
GROUP BY category
ORDER BY category;

-- Verificar se ainda há duplicatas
SELECT 
    'DUPLICATAS RESTANTES' as tipo,
    resource,
    action,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids
FROM permissions
GROUP BY resource, action
HAVING COUNT(*) > 1
ORDER BY resource, action;
