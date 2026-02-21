-- =====================================================
-- MIGRAÇÃO DE DADOS: banco_gestao -> postgres
-- Versão 2 - Mapeamento correto de colunas
-- =====================================================

-- Habilitar dblink
CREATE EXTENSION IF NOT EXISTS dblink;

\echo '=== INICIANDO MIGRAÇÃO V2 ==='

-- Pegar um usuário existente para usar como criado_por
\echo 'Buscando usuário para criado_por...'
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM users LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado no banco postgres!';
    END IF;
    RAISE NOTICE 'Usuário para criado_por: %', v_user_id;
    
    -- Salvar em tabela temporária
    CREATE TEMP TABLE IF NOT EXISTS _migration_config (key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO _migration_config VALUES ('default_user_id', v_user_id::TEXT)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END $$;

-- =====================================================
-- MIGRAR PRODUTOS
-- =====================================================
\echo 'Migrando PRODUTOS...'

INSERT INTO public.produtos (
    id, nome, modelo, marca, qualidade, codigo, codigo_barras, referencia,
    grupo, sub_grupo, valor_dinheiro_pix, valor_parcelado_6x, margem_percentual,
    quantidade, estoque_minimo, localizacao, situacao, criado_em, atualizado_em,
    criado_por, updated_at
)
SELECT 
    id::UUID,
    nome::TEXT,
    COALESCE(modelo, '')::TEXT as modelo,
    COALESCE(marca, '')::TEXT as marca,
    COALESCE(qualidade, '')::TEXT as qualidade,
    CASE WHEN codigo ~ '^\d+$' THEN codigo::INTEGER ELSE NULL END as codigo,
    codigo_barras::TEXT,
    referencia::TEXT,
    grupo::TEXT,
    sub_grupo::TEXT,
    COALESCE(valor_dinheiro_pix, preco_venda, 0)::NUMERIC(12,2) as valor_dinheiro_pix,
    COALESCE(valor_parcelado_6x, preco_venda, 0)::NUMERIC(12,2) as valor_parcelado_6x,
    COALESCE(margem_percentual, 0)::NUMERIC(6,2) as margem_percentual,
    COALESCE(quantidade, estoque_atual, 0)::INTEGER as quantidade,
    COALESCE(estoque_minimo, 0)::INTEGER as estoque_minimo,
    localizacao::TEXT,
    UPPER(COALESCE(situacao, 'ATIVO'))::TEXT as situacao,
    COALESCE(criado_em, created_at, NOW()) as criado_em,
    COALESCE(atualizado_em, created_at, NOW()) as atualizado_em,
    (SELECT value::UUID FROM _migration_config WHERE key = 'default_user_id') as criado_por,
    COALESCE(atualizado_em, created_at, NOW()) as updated_at
FROM dblink(
    'dbname=banco_gestao',
    'SELECT id, nome, modelo, marca, qualidade, codigo, codigo_barras, referencia,
            grupo, sub_grupo, valor_dinheiro_pix, valor_parcelado_6x, margem_percentual,
            quantidade, estoque_atual, estoque_minimo, localizacao, situacao, 
            criado_em, atualizado_em, created_at, preco_venda
     FROM produtos'
) AS t(
    id UUID, nome VARCHAR, modelo VARCHAR, marca VARCHAR, qualidade VARCHAR,
    codigo VARCHAR, codigo_barras VARCHAR, referencia VARCHAR, grupo VARCHAR,
    sub_grupo VARCHAR, valor_dinheiro_pix NUMERIC, valor_parcelado_6x NUMERIC,
    margem_percentual NUMERIC, quantidade INTEGER, estoque_atual INTEGER,
    estoque_minimo INTEGER, localizacao VARCHAR, situacao VARCHAR,
    criado_em TIMESTAMPTZ, atualizado_em TIMESTAMPTZ, created_at TIMESTAMPTZ,
    preco_venda NUMERIC
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    modelo = EXCLUDED.modelo,
    marca = EXCLUDED.marca,
    qualidade = EXCLUDED.qualidade,
    quantidade = EXCLUDED.quantidade,
    estoque_minimo = EXCLUDED.estoque_minimo,
    valor_dinheiro_pix = EXCLUDED.valor_dinheiro_pix,
    valor_parcelado_6x = EXCLUDED.valor_parcelado_6x,
    atualizado_em = NOW(),
    updated_at = NOW();

\echo 'Produtos migrados!'

-- =====================================================
-- MIGRAR CLIENTES
-- =====================================================
\echo 'Migrando CLIENTES...'

INSERT INTO public.clientes (
    id, tipo_pessoa, situacao, nome, nome_fantasia, cpf_cnpj, 
    data_nascimento, numero, cidade, telefone, email,
    created_at, updated_at
)
SELECT 
    id::UUID,
    COALESCE(tipo_pessoa, 'fisica')::TEXT as tipo_pessoa,
    COALESCE(LOWER(situacao), 'ativo')::TEXT as situacao,
    nome::TEXT,
    nome_fantasia::TEXT,
    cpf_cnpj::TEXT,
    data_nascimento::DATE,
    numero::TEXT,
    cidade::TEXT,
    telefone::TEXT,
    email::TEXT,
    COALESCE(created_at, NOW()) as created_at,
    COALESCE(updated_at, NOW()) as updated_at
FROM dblink(
    'dbname=banco_gestao',
    'SELECT id, tipo_pessoa, situacao, nome, nome_fantasia, cpf_cnpj,
            data_nascimento, numero, cidade, telefone, email, created_at, updated_at
     FROM clientes'
) AS t(
    id UUID, tipo_pessoa VARCHAR, situacao VARCHAR, nome VARCHAR, nome_fantasia VARCHAR,
    cpf_cnpj VARCHAR, data_nascimento DATE, numero VARCHAR, cidade VARCHAR,
    telefone VARCHAR, email VARCHAR, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    email = EXCLUDED.email,
    updated_at = NOW();

\echo 'Clientes migrados!'

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
\echo '=== VERIFICAÇÃO FINAL ==='

SELECT 'PRODUTOS' as tabela, 
       (SELECT COUNT(*) FROM dblink('dbname=banco_gestao', 'SELECT 1 FROM produtos') AS t(x INT)) as origem,
       COUNT(*) as destino
FROM produtos
UNION ALL
SELECT 'CLIENTES',
       (SELECT COUNT(*) FROM dblink('dbname=banco_gestao', 'SELECT 1 FROM clientes') AS t(x INT)),
       COUNT(*)
FROM clientes;

-- Limpar tabela temporária
DROP TABLE IF EXISTS _migration_config;

\echo '=== MIGRAÇÃO CONCLUÍDA ==='

