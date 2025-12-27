-- =====================================================
-- ADICIONAR COLUNAS FALTANTES NA TABELA CLIENTES
-- Executar com: sudo -u postgres psql -d postgres -f /tmp/ADICIONAR_COLUNAS_CLIENTES.sql
-- =====================================================

-- Adicionar colunas de contato
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone2 VARCHAR(50);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

-- Adicionar colunas de endereço detalhado
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);

-- Adicionar colunas de identificação
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rg_ie VARCHAR(30);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(20) DEFAULT 'fisica';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(20) DEFAULT 'cliente';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo INTEGER;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_original VARCHAR(50);

-- Adicionar colunas extras
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sexo VARCHAR(1);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(15,2) DEFAULT 0;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes(whatsapp);
CREATE INDEX IF NOT EXISTS idx_clientes_cidade ON clientes(cidade);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_cliente ON clientes(tipo_cliente);

-- Verificar estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;

