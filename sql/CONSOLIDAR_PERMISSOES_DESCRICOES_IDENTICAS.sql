-- ============================================================
-- CONSOLIDAR PERMISSÕES COM DESCRIÇÕES IDÊNTICAS
-- Remove duplicatas baseado em descrição (mantém a mais antiga)
-- ============================================================
-- IMPORTANTE: Se houver erro, execute ROLLBACK; antes de tentar novamente

-- Encerrar qualquer transação pendente
ROLLBACK;

BEGIN;

-- ============================================================
-- 1. IDENTIFICAR PERMISSÕES COM DESCRIÇÕES IDÊNTICAS
-- ============================================================
-- Criar tabela temporária com permissões a MANTER (a mais antiga de cada descrição)
CREATE TEMP TABLE permissions_to_keep_by_desc AS
SELECT DISTINCT ON (LOWER(TRIM(description)))
  id,
  resource,
  action,
  description,
  category,
  created_at
FROM permissions
WHERE description IS NOT NULL
ORDER BY LOWER(TRIM(description)), created_at ASC;

-- ============================================================
-- 2. IDENTIFICAR PERMISSÕES A DELETAR (mesma descrição, mas não a mantida)
-- ============================================================
CREATE TEMP TABLE permissions_to_delete_by_desc AS
SELECT p.id
FROM permissions p
WHERE p.description IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM permissions_to_keep_by_desc ptk 
    WHERE LOWER(TRIM(ptk.description)) = LOWER(TRIM(p.description))
      AND ptk.id != p.id
  );

-- ============================================================
-- 3. MOVER role_permissions DAS DUPLICATAS PARA A PERMISSÃO MANTIDA
-- ============================================================
WITH duplicate_mapping AS (
  SELECT 
    ptd.id as duplicate_id,
    ptk.id as keep_id
  FROM permissions_to_delete_by_desc ptd
  JOIN permissions p ON p.id = ptd.id
  JOIN permissions_to_keep_by_desc ptk ON LOWER(TRIM(ptk.description)) = LOWER(TRIM(p.description))
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

-- Deletar role_permissions que apontam para duplicatas
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions_to_delete_by_desc);

-- ============================================================
-- 4. MOVER user_permissions DAS DUPLICATAS PARA A PERMISSÃO MANTIDA
-- ============================================================
WITH duplicate_mapping AS (
  SELECT 
    ptd.id as duplicate_id,
    ptk.id as keep_id
  FROM permissions_to_delete_by_desc ptd
  JOIN permissions p ON p.id = ptd.id
  JOIN permissions_to_keep_by_desc ptk ON LOWER(TRIM(ptk.description)) = LOWER(TRIM(p.description))
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
WHERE permission_id IN (SELECT id FROM permissions_to_delete_by_desc);

-- ============================================================
-- 5. DELETAR PERMISSÕES DUPLICADAS POR DESCRIÇÃO
-- ============================================================
DELETE FROM permissions
WHERE id IN (SELECT id FROM permissions_to_delete_by_desc);

-- ============================================================
-- 6. CONSOLIDAR RECURSOS SIMILARES (products -> produtos, clients -> clientes)
-- ============================================================
-- Primeiro, identificar permissões que precisam ser consolidadas
CREATE TEMP TABLE permissions_to_consolidate AS
SELECT 
  p.id,
  p.resource as old_resource,
  p.action,
  CASE
    WHEN LOWER(p.resource) = 'products' THEN 'produtos'
    WHEN LOWER(p.resource) = 'clients' THEN 'clientes'
    WHEN LOWER(p.resource) = 'users' THEN 'usuarios'
    WHEN LOWER(p.resource) = 'sales' THEN 'vendas'
    WHEN LOWER(p.resource) = 'service_orders' OR LOWER(p.resource) = 'os' THEN 'ordens_servico'
    ELSE NULL
  END as new_resource
FROM permissions p
WHERE LOWER(p.resource) IN ('products', 'clients', 'users', 'sales', 'service_orders', 'os')
  AND CASE
    WHEN LOWER(p.resource) = 'products' THEN 'produtos'
    WHEN LOWER(p.resource) = 'clients' THEN 'clientes'
    WHEN LOWER(p.resource) = 'users' THEN 'usuarios'
    WHEN LOWER(p.resource) = 'sales' THEN 'vendas'
    WHEN LOWER(p.resource) = 'service_orders' OR LOWER(p.resource) = 'os' THEN 'ordens_servico'
    ELSE NULL
  END IS NOT NULL;

-- Identificar quais já existem (vamos mover associações e deletar)
CREATE TEMP TABLE permissions_to_delete_consolidate AS
SELECT ptc.id
FROM permissions_to_consolidate ptc
WHERE EXISTS (
  SELECT 1 FROM permissions p2
  WHERE p2.resource = ptc.new_resource
    AND p2.action = ptc.action
);

-- Mover role_permissions das que serão deletadas para as que já existem
WITH consolidation_mapping AS (
  SELECT 
    ptdc.id as duplicate_id,
    p2.id as keep_id
  FROM permissions_to_delete_consolidate ptdc
  JOIN permissions_to_consolidate ptc ON ptc.id = ptdc.id
  JOIN permissions p2 ON p2.resource = ptc.new_resource AND p2.action = ptc.action
)
UPDATE role_permissions rp
SET permission_id = cm.keep_id
FROM consolidation_mapping cm
WHERE rp.permission_id = cm.duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp2 
    WHERE rp2.role_id = rp.role_id 
      AND rp2.permission_id = cm.keep_id
  );

DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions_to_delete_consolidate);

-- Mover user_permissions
WITH consolidation_mapping AS (
  SELECT 
    ptdc.id as duplicate_id,
    p2.id as keep_id
  FROM permissions_to_delete_consolidate ptdc
  JOIN permissions_to_consolidate ptc ON ptc.id = ptdc.id
  JOIN permissions p2 ON p2.resource = ptc.new_resource AND p2.action = ptc.action
)
UPDATE user_permissions up
SET permission_id = cm.keep_id
FROM consolidation_mapping cm
WHERE up.permission_id = cm.duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up2 
    WHERE up2.user_id = up.user_id 
      AND up2.permission_id = cm.keep_id
  );

DELETE FROM user_permissions
WHERE permission_id IN (SELECT id FROM permissions_to_delete_consolidate);

-- Deletar permissões que já existem na versão consolidada
DELETE FROM permissions
WHERE id IN (SELECT id FROM permissions_to_delete_consolidate);

-- Atualizar recursos das que NÃO têm duplicata (podem ser atualizadas diretamente)
UPDATE permissions p
SET resource = ptc.new_resource
FROM permissions_to_consolidate ptc
WHERE p.id = ptc.id
  AND NOT EXISTS (
    SELECT 1 FROM permissions_to_delete_consolidate ptdc WHERE ptdc.id = p.id
  );

-- Limpar tabelas temporárias
DROP TABLE IF EXISTS permissions_to_consolidate;
DROP TABLE IF EXISTS permissions_to_delete_consolidate;

-- ============================================================
-- 7. LIMPAR TABELAS TEMPORÁRIAS
-- ============================================================
DROP TABLE IF EXISTS permissions_to_keep_by_desc;
DROP TABLE IF EXISTS permissions_to_delete_by_desc;

COMMIT;

-- ============================================================
-- 8. VERIFICAR RESULTADO
-- ============================================================
-- Verificar se ainda há descrições duplicadas
SELECT 
    'DESCRIÇÕES AINDA DUPLICADAS' as tipo,
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

-- Listar todas as permissões por categoria
SELECT 
    'RESULTADO FINAL' as tipo,
    category as categoria,
    COUNT(*) as total_permissoes,
    STRING_AGG(resource || '.' || action || ' (' || COALESCE(description, 'sem desc') || ')', E'\n' ORDER BY resource, action) as permissoes
FROM permissions
GROUP BY category
ORDER BY category;
