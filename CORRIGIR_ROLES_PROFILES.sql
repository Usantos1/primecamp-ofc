-- Script para permitir novos roles na tabela profiles
-- O problema: pode existir uma constraint CHECK que só aceita 'admin' ou 'member'

-- 1. Verificar constraints existentes na coluna role
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c';

-- 2. Remover constraint de role se existir
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar constraint relacionada a role
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'profiles'::regclass 
    AND pg_get_constraintdef(oid) LIKE '%role%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Constraint % removida com sucesso!', constraint_name;
    ELSE
        RAISE NOTICE 'Nenhuma constraint de role encontrada';
    END IF;
END $$;

-- 3. Alterar coluna role para aceitar mais valores (se necessário)
-- Primeiro verificar o tipo atual
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- 4. Se a coluna for do tipo enum, precisamos recriá-la como varchar
-- Verificar se é enum
SELECT typname, enumlabel 
FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE typname LIKE '%role%';

-- 5. Se não encontrar problema, garantir que a coluna é VARCHAR suficientemente grande
ALTER TABLE profiles 
ALTER COLUMN role TYPE VARCHAR(50);

-- 6. Definir valor padrão
ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'member';

-- Verificar resultado
SELECT 'Coluna role atualizada com sucesso!' as status;

-- Listar roles únicos existentes
SELECT DISTINCT role, COUNT(*) as qtd 
FROM profiles 
GROUP BY role 
ORDER BY qtd DESC;

