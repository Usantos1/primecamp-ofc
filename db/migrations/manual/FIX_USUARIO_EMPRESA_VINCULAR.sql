-- Vincular usuário à empresa correta (evitar ver dados de outra empresa)
-- Use quando ao logar na empresa X ainda aparecer dados da empresa Y.
-- Substitua o email pelo do usuário e o nome da empresa pelo desejado.

-- 1) Ver situação atual
SELECT u.id, u.email, u.company_id, c.name AS empresa_atual
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
WHERE u.email IN ('uander@ativacrm.com', 'uander9sts@gmail.com');  -- ajuste os emails

-- 2) Vincular usuário(s) à empresa "Ativa CRM"
UPDATE users
SET company_id = (SELECT id FROM companies WHERE name ILIKE '%Ativa CRM%' LIMIT 1)
WHERE email = 'uander@ativacrm.com';  -- ajuste o email

-- 3) Opcional: vincular todos que devem estar na Prime Camp Admin
-- UPDATE users
-- SET company_id = (SELECT id FROM companies WHERE name ILIKE '%Prime Camp Admin%' LIMIT 1)
-- WHERE email IN ('admin@primecamp.cloud', 'elizangela@...', 'natalia@...', 'vitor@...', 'lojaprimecamp@gmail.com');

-- 4) Conferir após o UPDATE
SELECT u.email, c.name AS empresa
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
ORDER BY c.name, u.email;
