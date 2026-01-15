-- ============================================================
-- LIMPAR FUNÇÕES DUPLICADAS - VERSÃO DIRETA E SIMPLES
-- ============================================================
-- Este script mantém apenas UMA função de cada nome
-- Mantém a função com MAIS permissões associadas

BEGIN;

-- 1. IDENTIFICAR DUPLICADOS E ESCOLHER QUAL MANTER
WITH ranked_roles AS (
  SELECT 
    r.id,
    r.name,
    COUNT(rp.permission_id) as permission_count,
    ROW_NUMBER() OVER (
      PARTITION BY r.name 
      ORDER BY 
        COUNT(rp.permission_id) DESC,  -- Mais permissões primeiro
        r.updated_at DESC,              -- Mais recente segundo
        r.created_at ASC                -- Mais antiga terceiro
    ) as rank
  FROM roles r
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  GROUP BY r.id, r.name, r.updated_at, r.created_at
),
roles_to_keep AS (
  SELECT id, name
  FROM ranked_roles
  WHERE rank = 1
),
roles_to_delete AS (
  SELECT id, name
  FROM ranked_roles
  WHERE rank > 1
)
-- 2. ATUALIZAR USUÁRIOS QUE ESTÃO USANDO AS FUNÇÕES QUE SERÃO DELETADAS
UPDATE profiles p
SET role = (SELECT name FROM roles_to_keep WHERE name = p.role LIMIT 1)
WHERE p.role IN (SELECT name FROM roles_to_delete)
AND EXISTS (SELECT 1 FROM roles_to_keep WHERE name = p.role);

-- 3. DELETAR PERMISSÕES DAS FUNÇÕES DUPLICADAS
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM ranked_roles WHERE rank > 1);

-- 4. DELETAR AS FUNÇÕES DUPLICADAS
DELETE FROM roles
WHERE id IN (SELECT id FROM ranked_roles WHERE rank > 1);

COMMIT;

-- Verificar resultado
SELECT 
    name,
    display_name,
    COUNT(*) as quantidade
FROM roles
GROUP BY name, display_name
HAVING COUNT(*) > 1;

-- Se retornar 0 linhas, não há mais duplicações! ✅
