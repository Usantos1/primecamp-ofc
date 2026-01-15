-- ============================================================
-- LIMPAR E CONSOLIDAR PERMISSÕES DUPLICADAS
-- Este script consolida categorias e remove permissões duplicadas
-- ============================================================

BEGIN;

-- ============================================================
-- 1. MAPEAMENTO DE CATEGORIAS (consolidar para nomes padrão)
-- ============================================================
-- Criar tabela temporária com mapeamento de categorias
CREATE TEMP TABLE IF NOT EXISTS category_mapping AS
SELECT * FROM (VALUES
  -- Clientes (consolidar todas as variações)
  ('Clientes', 'clientes'),
  ('clientes', 'clientes'),
  
  -- PDV - Vendas (consolidar)
  ('PDV', 'pdv'),
  ('pdv', 'pdv'),
  ('Vendas', 'pdv'),
  ('vendas', 'pdv'),
  ('PDV - Vendas', 'pdv'),
  
  -- Assistência Técnica
  ('Assistência', 'assistencia'),
  ('Assistência Técnica', 'assistencia'),
  ('assistencia', 'assistencia'),
  ('os', 'assistencia'),
  ('OS', 'assistencia'),
  
  -- Produtos (consolidar)
  ('Produtos', 'produtos'),
  ('produtos', 'produtos'),
  
  -- Administração
  ('Admin', 'admin'),
  ('admin', 'admin'),
  ('Administração', 'admin'),
  ('administracao', 'admin'),
  
  -- Recursos Humanos
  ('RH', 'rh'),
  ('rh', 'rh'),
  ('Recursos Humanos', 'rh'),
  ('recursos_humanos', 'rh'),
  
  -- Gestão
  ('Gestão', 'gestao'),
  ('gestao', 'gestao'),
  ('Geral', 'gestao'),
  
  -- Financeiro
  ('Financeiro', 'financeiro'),
  ('financeiro', 'financeiro'),
  
  -- Relatórios
  ('Relatórios', 'relatorios'),
  ('relatorios', 'relatorios'),
  ('Reports', 'relatorios')
) AS mapping(old_category, new_category);

-- ============================================================
-- 2. ATUALIZAR CATEGORIAS PARA NOMES PADRONIZADOS
-- ============================================================
UPDATE permissions p
SET category = COALESCE(
  (SELECT new_category FROM category_mapping WHERE old_category = p.category),
  p.category
)
WHERE EXISTS (
  SELECT 1 FROM category_mapping WHERE old_category = p.category
);

-- ============================================================
-- 3. IDENTIFICAR E REMOVER PERMISSÕES DUPLICADAS (mesmo resource.action)
-- ============================================================
-- Criar tabela temporária com IDs a manter (manter a mais antiga)
CREATE TEMP TABLE IF NOT EXISTS permissions_to_keep AS
SELECT DISTINCT ON (resource, action)
  id,
  resource,
  action,
  category
FROM permissions
ORDER BY resource, action, created_at ASC;

-- Criar tabela temporária com IDs a deletar
CREATE TEMP TABLE IF NOT EXISTS permissions_to_delete AS
SELECT p.id
FROM permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM permissions_to_keep ptk WHERE ptk.id = p.id
);

-- ============================================================
-- 4. REMOVER PERMISSÕES DE ROLE_PERMISSIONS ANTES DE DELETAR
-- ============================================================
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions_to_delete);

-- ============================================================
-- 5. REMOVER PERMISSÕES DE USER_PERMISSIONS ANTES DE DELETAR
-- ============================================================
DELETE FROM user_permissions
WHERE permission_id IN (SELECT id FROM permissions_to_delete);

-- ============================================================
-- 6. DELETAR PERMISSÕES DUPLICADAS
-- ============================================================
DELETE FROM permissions
WHERE id IN (SELECT id FROM permissions_to_delete);

-- ============================================================
-- 7. ATUALIZAR CATEGORIAS RESTANTES (garantir padronização)
-- ============================================================
UPDATE permissions p
SET category = COALESCE(
  (SELECT new_category FROM category_mapping WHERE old_category = p.category),
  LOWER(TRIM(p.category))
)
WHERE category IS NOT NULL;

-- ============================================================
-- 8. LIMPAR TABELAS TEMPORÁRIAS
-- ============================================================
DROP TABLE IF EXISTS category_mapping;
DROP TABLE IF EXISTS permissions_to_keep;
DROP TABLE IF EXISTS permissions_to_delete;

COMMIT;

-- ============================================================
-- 9. VERIFICAR RESULTADO
-- ============================================================
SELECT 
    'RESULTADO' as tipo,
    category as categoria,
    COUNT(*) as total_permissoes,
    STRING_AGG(resource || '.' || action, ', ' ORDER BY resource, action) as permissoes
FROM permissions
GROUP BY category
ORDER BY category;
