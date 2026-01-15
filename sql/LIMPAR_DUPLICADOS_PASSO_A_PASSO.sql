-- ============================================================
-- LIMPAR FUNÇÕES DUPLICADAS - VERSÃO PASSO A PASSO
-- ============================================================
-- Execute cada seção separadamente para ver o que está sendo feito

-- PASSO 1: VER QUAIS FUNÇÕES ESTÃO DUPLICADAS
SELECT 
    name,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids,
    STRING_AGG(display_name, ' | ') as nomes_exibicao
FROM roles
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY name;

-- PASSO 2: VER QUANTAS PERMISSÕES CADA FUNÇÃO DUPLICADA TEM
SELECT 
    r.id,
    r.name,
    r.display_name,
    COUNT(rp.permission_id) as total_permissoes,
    r.created_at,
    r.updated_at
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE r.name IN (
    SELECT name 
    FROM roles 
    GROUP BY name 
    HAVING COUNT(*) > 1
)
GROUP BY r.id, r.name, r.display_name, r.created_at, r.updated_at
ORDER BY r.name, COUNT(rp.permission_id) DESC, r.updated_at DESC;

-- PASSO 3: IDENTIFICAR QUAIS VÃO SER DELETADAS (rank > 1)
WITH ranked_roles AS (
  SELECT 
    r.id,
    r.name,
    r.display_name,
    COUNT(rp.permission_id) as permission_count,
    ROW_NUMBER() OVER (
      PARTITION BY r.name 
      ORDER BY 
        COUNT(rp.permission_id) DESC,
        r.updated_at DESC,
        r.created_at ASC
    ) as rank
  FROM roles r
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  GROUP BY r.id, r.name, r.display_name, r.updated_at, r.created_at
)
SELECT 
    id,
    name,
    display_name,
    permission_count,
    CASE WHEN rank = 1 THEN 'MANTER' ELSE 'DELETAR' END as acao
FROM ranked_roles
WHERE name IN (
    SELECT name 
    FROM roles 
    GROUP BY name 
    HAVING COUNT(*) > 1
)
ORDER BY name, rank;

-- PASSO 4: VER QUANTOS USUÁRIOS ESTÃO USANDO AS FUNÇÕES QUE SERÃO DELETADAS
WITH ranked_roles AS (
  SELECT 
    r.id,
    r.name,
    COUNT(rp.permission_id) as permission_count,
    ROW_NUMBER() OVER (
      PARTITION BY r.name 
      ORDER BY 
        COUNT(rp.permission_id) DESC,
        r.updated_at DESC,
        r.created_at ASC
    ) as rank
  FROM roles r
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  GROUP BY r.id, r.name, r.updated_at, r.created_at
),
roles_to_delete AS (
  SELECT id, name
  FROM ranked_roles
  WHERE rank > 1
)
SELECT 
    p.role as nome_funcao,
    COUNT(*) as usuarios_afetados,
    STRING_AGG(u.email, ', ') as emails
FROM profiles p
JOIN users u ON u.id = p.user_id
WHERE p.role IN (SELECT name FROM roles_to_delete)
GROUP BY p.role;

-- PASSO 5: EXECUTAR A LIMPEZA (DESCOMENTE PARA EXECUTAR)
/*
BEGIN;

WITH ranked_roles AS (
  SELECT 
    r.id,
    r.name,
    COUNT(rp.permission_id) as permission_count,
    ROW_NUMBER() OVER (
      PARTITION BY r.name 
      ORDER BY 
        COUNT(rp.permission_id) DESC,
        r.updated_at DESC,
        r.created_at ASC
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
-- Atualizar usuários
UPDATE profiles p
SET role = (SELECT name FROM roles_to_keep WHERE name = p.role LIMIT 1)
WHERE p.role IN (SELECT name FROM roles_to_delete)
AND EXISTS (SELECT 1 FROM roles_to_keep WHERE name = p.role);

-- Deletar permissões
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles_to_delete);

-- Deletar roles
DELETE FROM roles
WHERE id IN (SELECT id FROM roles_to_delete);

COMMIT;
*/

-- PASSO 6: VERIFICAR RESULTADO FINAL
SELECT 
    name,
    display_name,
    COUNT(*) as quantidade
FROM roles
GROUP BY name, display_name
HAVING COUNT(*) > 1;
