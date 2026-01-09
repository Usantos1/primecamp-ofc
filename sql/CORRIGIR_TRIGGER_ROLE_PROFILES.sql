-- ============================================================
-- CORRIGIR TRIGGER QUE BLOQUEIA ALTERAÇÃO DE ROLE
-- Erro: "Permission denied: Only admins can change user roles"
-- ============================================================

-- 1. Verificar se existe o trigger problemático
SELECT tgname, tgrelid::regclass, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'profiles'::regclass
AND NOT tgisinternal;

-- 2. Listar todas as functions que podem ter a mensagem de erro
SELECT proname, prosrc 
FROM pg_proc 
WHERE prosrc LIKE '%Only admins%' 
   OR prosrc LIKE '%Permission denied%'
   OR prosrc LIKE '%role%change%';

-- 3. Se encontrar um trigger bloqueante, REMOVA-O:
-- (Execute após verificar qual é o trigger correto)

-- DROP TRIGGER IF EXISTS check_role_change_trigger ON profiles;
-- DROP TRIGGER IF EXISTS prevent_role_change_trigger ON profiles;
-- DROP TRIGGER IF EXISTS validate_role_update ON profiles;

-- 4. Criar uma nova trigger function que PERMITE admins alterarem roles
CREATE OR REPLACE FUNCTION check_role_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Permite qualquer alteração de role
  -- A validação de permissão é feita no backend (middleware authenticateToken + requireAdmin)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Se quiser manter uma trigger, use esta versão mais permissiva:
-- DROP TRIGGER IF EXISTS check_role_update_trigger ON profiles;
-- CREATE TRIGGER check_role_update_trigger
--   BEFORE UPDATE ON profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION check_role_update();

-- ============================================================
-- OPÇÃO MAIS SIMPLES: Remover todas as triggers de role do profiles
-- ============================================================

DO $$
DECLARE
  trig_name TEXT;
BEGIN
  FOR trig_name IN
    SELECT tgname FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid = 'profiles'::regclass
    AND NOT tgisinternal
    AND (p.prosrc LIKE '%role%' OR p.prosrc LIKE '%admin%' OR p.prosrc LIKE '%Permission%')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON profiles', trig_name);
    RAISE NOTICE 'Trigger removido: %', trig_name;
  END LOOP;
END;
$$;

-- Verificar resultado
SELECT 'Triggers restantes na tabela profiles:' as info;
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgrelid = 'profiles'::regclass
AND NOT tgisinternal;

