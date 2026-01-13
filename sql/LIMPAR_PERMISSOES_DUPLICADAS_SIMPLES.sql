-- ============================================================
-- LIMPAR PERMISSÕES DUPLICADAS - VERSÃO SIMPLES E DIRETA
-- Remove duplicatas baseado em resource.action (mantém a mais antiga)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. IDENTIFICAR PERMISSÕES DUPLICADAS (mesmo resource.action)
-- ============================================================
-- Criar tabela temporária com permissões a MANTER (a mais antiga de cada resource.action)
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
-- 2. IDENTIFICAR PERMISSÕES A DELETAR (todas exceto as que vamos manter)
-- ============================================================
CREATE TEMP TABLE permissions_to_delete AS
SELECT p.id
FROM permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM permissions_to_keep ptk WHERE ptk.id = p.id
);

-- ============================================================
-- 3. MOVER role_permissions DAS DUPLICATAS PARA A PERMISSÃO MANTIDA
-- ============================================================
-- Para cada role_permission que aponta para uma duplicata,
-- mover para a permissão mantida (se ainda não existir)
WITH duplicate_mapping AS (
  SELECT 
    ptd.id as duplicate_id,
    ptk.id as keep_id
  FROM permissions_to_delete ptd
  JOIN permissions p ON p.id = ptd.id
  JOIN permissions_to_keep ptk ON ptk.resource = p.resource AND ptk.action = p.action
)
UPDATE role_permissions rp
SET permission_id = dm.keep_id
FROM duplicate_mapping dm
WHERE rp.permission_id = dm.duplicate_id
  AND NOT EXISTS (
    -- Não atualizar se já existe a associação com a permissão mantida
    SELECT 1 FROM role_permissions rp2 
    WHERE rp2.role_id = rp.role_id 
      AND rp2.permission_id = dm.keep_id
  );

-- Deletar role_permissions que apontam para duplicatas (já foram movidas ou são redundantes)
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions_to_delete);

-- ============================================================
-- 4. MOVER user_permissions DAS DUPLICATAS PARA A PERMISSÃO MANTIDA
-- ============================================================
WITH duplicate_mapping AS (
  SELECT 
    ptd.id as duplicate_id,
    ptk.id as keep_id
  FROM permissions_to_delete ptd
  JOIN permissions p ON p.id = ptd.id
  JOIN permissions_to_keep ptk ON ptk.resource = p.resource AND ptk.action = p.action
)
UPDATE user_permissions up
SET permission_id = dm.keep_id
FROM duplicate_mapping dm
WHERE up.permission_id = dm.duplicate_id
  AND NOT EXISTS (
    -- Não atualizar se já existe a associação com a permissão mantida
    SELECT 1 FROM user_permissions up2 
    WHERE up2.user_id = up.user_id 
      AND up2.permission_id = dm.keep_id
  );

-- Deletar user_permissions que apontam para duplicatas
DELETE FROM user_permissions
WHERE permission_id IN (SELECT id FROM permissions_to_delete);

-- ============================================================
-- 5. DELETAR PERMISSÕES DUPLICADAS
-- ============================================================
DELETE FROM permissions
WHERE id IN (SELECT id FROM permissions_to_delete);

-- ============================================================
-- 6. CONSOLIDAR CATEGORIAS (padronizar nomes)
-- ============================================================
UPDATE permissions
SET category = CASE
  WHEN LOWER(TRIM(category)) IN ('clientes', 'cliente') THEN 'clientes'
  WHEN LOWER(TRIM(category)) IN ('pdv', 'vendas', 'pdv - vendas', 'pdv-vendas') THEN 'pdv'
  WHEN LOWER(TRIM(category)) IN ('assistência', 'assistência técnica', 'assistencia', 'assistencia tecnica', 'os') THEN 'assistencia'
  WHEN LOWER(TRIM(category)) IN ('produtos', 'produto') THEN 'produtos'
  WHEN LOWER(TRIM(category)) IN ('admin', 'administração', 'administracao', 'administração') THEN 'admin'
  WHEN LOWER(TRIM(category)) IN ('rh', 'recursos humanos', 'recursos_humanos') THEN 'rh'
  WHEN LOWER(TRIM(category)) IN ('gestão', 'gestao', 'geral') THEN 'gestao'
  WHEN LOWER(TRIM(category)) IN ('financeiro') THEN 'financeiro'
  WHEN LOWER(TRIM(category)) IN ('relatórios', 'relatorios', 'reports') THEN 'relatorios'
  WHEN LOWER(TRIM(category)) IN ('usuários', 'usuarios', 'users') THEN 'usuarios'
  ELSE LOWER(TRIM(category))
END
WHERE category IS NOT NULL;

-- ============================================================
-- 7. LIMPAR TABELAS TEMPORÁRIAS
-- ============================================================
DROP TABLE IF EXISTS permissions_to_keep;
DROP TABLE IF EXISTS permissions_to_delete;

COMMIT;

-- ============================================================
-- 8. VERIFICAR RESULTADO
-- ============================================================
-- Listar categorias e permissões
SELECT 
    'RESULTADO FINAL' as tipo,
    category as categoria,
    COUNT(*) as total_permissoes,
    STRING_AGG(resource || '.' || action || ' (' || COALESCE(description, 'sem desc') || ')', E'\n' ORDER BY resource, action) as permissoes
FROM permissions
GROUP BY category
ORDER BY category;

-- Verificar se ainda há duplicatas
SELECT 
    'DUPLICATAS RESTANTES' as tipo,
    resource,
    action,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids,
    STRING_AGG(category, ' | ') as categorias
FROM permissions
GROUP BY resource, action
HAVING COUNT(*) > 1
ORDER BY resource, action;
