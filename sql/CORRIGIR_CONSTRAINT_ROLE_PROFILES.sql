-- ============================================================
-- CORRIGIR CONSTRAINT QUE BLOQUEIA VALORES DE ROLE
-- Erro: "new row for relation "profiles" violates check constraint "profiles_role_check"
-- ============================================================

-- 1. Verificar a constraint atual
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname = 'profiles_role_check';

-- 2. Remover a constraint existente
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. (Opcional) Criar uma nova constraint mais permissiva que aceita todos os roles
-- Se quiser manter uma validação no banco, descomente as linhas abaixo:
-- ALTER TABLE profiles 
-- ADD CONSTRAINT profiles_role_check 
-- CHECK (role IN (
--   'admin', 'gerente', 'supervisor', 'vendedor', 'caixa', 
--   'estoquista', 'financeiro', 'atendente', 'member'
-- ));

-- 4. Verificar se a constraint foi removida
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname LIKE '%role%';

-- 5. Verificar valores únicos de role atuais
SELECT DISTINCT role, COUNT(*) as qtd 
FROM profiles 
GROUP BY role 
ORDER BY qtd DESC;

-- Resultado esperado: Constraint removida, todos os roles podem ser usados
