-- =====================================================
-- MIGRAR DADOS DE banco_gestao PARA postgres
-- Execute com: psql -d postgres -f MIGRAR_DADOS_PARA_POSTGRES.sql
-- =====================================================

\echo '=== INICIANDO MIGRAÇÃO DE DADOS ==='

-- 1. MIGRAR USUÁRIOS (que não existem)
\echo 'Migrando usuários...'
INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
SELECT id, email, password_hash, created_at, updated_at
FROM dblink('dbname=banco_gestao', 'SELECT id, email, password_hash, created_at, updated_at FROM users')
AS t(id UUID, email TEXT, password_hash TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    updated_at = EXCLUDED.updated_at;

-- 2. MIGRAR PROFILES
\echo 'Migrando profiles...'
INSERT INTO public.profiles (id, user_id, display_name, role, department, position, avatar_url, created_at, updated_at)
SELECT id, user_id, display_name, role, department, position, avatar_url, created_at, updated_at
FROM dblink('dbname=banco_gestao', 'SELECT id, user_id, display_name, role, department, position, avatar_url, created_at, updated_at FROM profiles')
AS t(id UUID, user_id UUID, display_name TEXT, role TEXT, department TEXT, position TEXT, avatar_url TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = EXCLUDED.updated_at;

-- 3. MIGRAR CLIENTES
\echo 'Migrando clientes...'
INSERT INTO public.clientes (id, nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes, created_at, updated_at)
SELECT id, nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes, created_at, updated_at
FROM dblink('dbname=banco_gestao', 'SELECT id, nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes, created_at, updated_at FROM clientes')
AS t(id UUID, nome TEXT, cpf_cnpj TEXT, telefone TEXT, email TEXT, endereco TEXT, cidade TEXT, estado TEXT, cep TEXT, observacoes TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO NOTHING;

-- 4. MIGRAR PRODUTOS
\echo 'Migrando produtos...'
INSERT INTO public.produtos (id, codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque_atual, estoque_minimo, ativo, created_at, updated_at)
SELECT id, codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque_atual, estoque_minimo, ativo, created_at, updated_at
FROM dblink('dbname=banco_gestao', 'SELECT id, codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque_atual, estoque_minimo, ativo, created_at, updated_at FROM produtos')
AS t(id UUID, codigo TEXT, codigo_barras TEXT, nome TEXT, descricao TEXT, categoria TEXT, marca TEXT, unidade TEXT, preco_custo NUMERIC, preco_venda NUMERIC, estoque_atual NUMERIC, estoque_minimo NUMERIC, ativo BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO NOTHING;

-- 5. MIGRAR ROLES
\echo 'Migrando roles...'
INSERT INTO public.roles (id, name, display_name, description, is_system, created_at, updated_at)
SELECT id, name, display_name, description, is_system, created_at, updated_at
FROM dblink('dbname=banco_gestao', 'SELECT id, name, display_name, description, is_system, created_at, updated_at FROM roles')
AS t(id UUID, name TEXT, display_name TEXT, description TEXT, is_system BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO NOTHING;

-- 6. MIGRAR PERMISSIONS
\echo 'Migrando permissions...'
INSERT INTO public.permissions (id, name, description, module, created_at)
SELECT id, name, description, module, created_at
FROM dblink('dbname=banco_gestao', 'SELECT id, name, description, module, created_at FROM permissions')
AS t(id UUID, name TEXT, description TEXT, module TEXT, created_at TIMESTAMPTZ)
ON CONFLICT (id) DO NOTHING;

-- 7. MIGRAR TELEGRAM_CONFIG
\echo 'Migrando telegram_config...'
INSERT INTO public.telegram_config (id, config_type, chat_id, description, is_active, created_at, updated_at)
SELECT id, config_type, chat_id, description, is_active, created_at, updated_at
FROM dblink('dbname=banco_gestao', 'SELECT id, config_type, chat_id, description, is_active, created_at, updated_at FROM telegram_config')
AS t(id UUID, config_type TEXT, chat_id TEXT, description TEXT, is_active BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO NOTHING;

\echo '=== MIGRAÇÃO CONCLUÍDA ==='

-- Verificar totais
\echo 'Verificando totais após migração:'
SELECT 'users' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL
SELECT 'produtos', COUNT(*) FROM produtos
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'telegram_config', COUNT(*) FROM telegram_config;

