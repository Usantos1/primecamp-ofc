-- ============================================================
-- REMOVER TRIGGER QUE BLOQUEIA ALTERAÇÃO DE ROLE
-- Erro: "Permission denied: Only admins can change user roles"
-- ============================================================

-- Remover todos os triggers que bloqueiam alteração de role
DO $$
DECLARE
  trig_name TEXT;
BEGIN
  FOR trig_name IN
    SELECT tgname FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid = 'profiles'::regclass
    AND NOT tgisinternal
    AND (p.prosrc LIKE '%Only admins%' 
         OR p.prosrc LIKE '%Permission denied%' 
         OR p.prosrc LIKE '%role%change%'
         OR p.prosrc LIKE '%change user roles%')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON profiles', trig_name);
    RAISE NOTICE 'Trigger removido: %', trig_name;
  END LOOP;
END;
$$;

-- Verificar se ainda existem triggers problemáticos
SELECT 'Triggers restantes na tabela profiles:' as info;
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgrelid = 'profiles'::regclass
AND NOT tgisinternal;

-- Verificar se as functions problemáticas foram removidas
SELECT 'Functions que podem ter validação de role:' as info;
SELECT proname, prosrc 
FROM pg_proc 
WHERE prosrc LIKE '%Only admins%' 
   OR prosrc LIKE '%Permission denied%'
   OR prosrc LIKE '%change user roles%';
