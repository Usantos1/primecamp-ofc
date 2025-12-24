-- Script para migrar usuários do Supabase Auth para a tabela users
-- IMPORTANTE: Este script deve ser executado manualmente após exportar dados do Supabase
-- 
-- Para obter os dados do Supabase:
-- 1. Acesse o dashboard do Supabase
-- 2. Vá em Authentication > Users
-- 3. Exporte os dados (ou use a API)
-- 4. Execute este script com os dados exportados

-- Exemplo de INSERT (substitua pelos dados reais):
-- INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at)
-- VALUES 
--   ('uuid-do-usuario-1', 'usuario1@email.com', 'hash-da-senha-do-supabase', true, '2025-01-01', NOW()),
--   ('uuid-do-usuario-2', 'usuario2@email.com', 'hash-da-senha-do-supabase', true, '2025-01-01', NOW())
-- ON CONFLICT (email) DO NOTHING;

-- NOTA: O Supabase usa bcrypt para hash de senhas, então podemos reutilizar os hashes existentes
-- se conseguirmos exportá-los. Caso contrário, será necessário resetar senhas.

