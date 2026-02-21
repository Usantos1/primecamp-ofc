-- =============================================
-- SQL PARA CRIAR TABELAS DE API TOKENS
-- Execute na VPS com: psql -U postgres -d banco_gestao -f CRIAR_TABELAS_API_TOKENS.sql
-- =============================================

-- Verificar se a tabela users existe primeiro
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE EXCEPTION 'Tabela users não existe! Execute primeiro a migração de usuários.';
    END IF;
END $$;

-- Criar tabela api_tokens
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    token VARCHAR(64) UNIQUE NOT NULL,
    permissoes JSONB DEFAULT '["produtos:read"]'::jsonb,
    ativo BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    ultimo_uso TIMESTAMP,
    uso_count INTEGER DEFAULT 0,
    criado_por UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela api_access_logs
CREATE TABLE IF NOT EXISTS api_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES api_tokens(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    ip_address VARCHAR(45),
    user_agent TEXT,
    query_params JSONB,
    response_status INTEGER,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_api_tokens_ativo ON api_tokens(ativo);
CREATE INDEX IF NOT EXISTS idx_api_tokens_criado_por ON api_tokens(criado_por);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_token_id ON api_access_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_created_at ON api_access_logs(created_at);

-- Comentários
COMMENT ON TABLE api_tokens IS 'Tabela de tokens de API para integração externa';
COMMENT ON TABLE api_access_logs IS 'Logs de acesso aos endpoints da API usando tokens';

-- Verificar se as tabelas foram criadas
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_tokens') THEN
        RAISE NOTICE '✅ Tabela api_tokens criada com sucesso!';
    ELSE
        RAISE EXCEPTION '❌ Erro ao criar tabela api_tokens';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_access_logs') THEN
        RAISE NOTICE '✅ Tabela api_access_logs criada com sucesso!';
    ELSE
        RAISE EXCEPTION '❌ Erro ao criar tabela api_access_logs';
    END IF;
END $$;

-- Mostrar estrutura das tabelas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('api_tokens', 'api_access_logs')
ORDER BY table_name, ordinal_position;

