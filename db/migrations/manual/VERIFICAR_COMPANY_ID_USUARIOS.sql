-- Verificar company_id dos usuários
-- Execute este script para verificar se os usuários têm company_id definido

-- 1. Listar todos os usuários com seus company_id
SELECT 
    u.id,
    u.email,
    u.company_id,
    c.name as company_name,
    p.role,
    p.display_name
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
LEFT JOIN profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC;

-- 2. Verificar quantos usuários têm company_id NULL
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(u.company_id) as usuarios_com_company_id,
    COUNT(*) - COUNT(u.company_id) as usuarios_sem_company_id
FROM users u;

-- 3. Listar usuários SEM company_id (precisam ser corrigidos)
SELECT 
    u.id,
    u.email,
    p.display_name,
    p.role,
    u.created_at
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.company_id IS NULL
ORDER BY u.created_at DESC;

-- 4. Verificar qual é o ID da empresa principal (Prime Camp LTDA)
SELECT id, name, status FROM companies WHERE name LIKE '%Prime Camp%' OR name LIKE '%PRIME CAMP%' LIMIT 5;

