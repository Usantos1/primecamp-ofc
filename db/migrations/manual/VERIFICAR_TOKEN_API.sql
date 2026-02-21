-- Script para verificar e corrigir tokens de API
-- Execute: psql -U postgres -d banco_gestao -f VERIFICAR_TOKEN_API.sql

-- 1. Verificar todos os tokens
SELECT 
    id,
    nome,
    LEFT(token, 20) || '...' as token_preview,
    LENGTH(token) as token_length,
    ativo,
    expires_at,
    created_at
FROM api_tokens
ORDER BY created_at DESC;

-- 2. Verificar se há tokens inativos
SELECT COUNT(*) as tokens_inativos
FROM api_tokens
WHERE ativo = false;

-- 3. Verificar token específico (substitua pelo token real)
-- SELECT * FROM api_tokens WHERE token = '33db39d91ff563f1b71a8f026392ef3f1a281bb9d58b296de514083e98fba123';

-- 4. Ativar token se estiver inativo (descomente se necessário)
-- UPDATE api_tokens 
-- SET ativo = true 
-- WHERE token = '33db39d91ff563f1b71a8f026392ef3f1a281bb9d58b296de514083e98fba123';

-- 5. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'api_tokens'
ORDER BY ordinal_position;

