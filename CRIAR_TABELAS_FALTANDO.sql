-- ============================================
-- SCRIPT PARA CRIAR TABELAS FALTANDO NO banco_gestao
-- Execute este script no PostgreSQL da VPS
-- ============================================

-- ========== TABELA: permissions ==========
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Inserir permissões padrão
INSERT INTO permissions (resource, action, description, category) VALUES
  ('users', 'view', 'Ver usuários', 'Usuários'),
  ('users', 'create', 'Criar usuários', 'Usuários'),
  ('users', 'edit', 'Editar usuários', 'Usuários'),
  ('users', 'delete', 'Deletar usuários', 'Usuários'),
  ('dashboard', 'view', 'Ver dashboard', 'Dashboard'),
  ('pdv', 'view', 'Ver PDV', 'PDV'),
  ('pdv', 'sell', 'Realizar vendas', 'PDV'),
  ('os', 'view', 'Ver ordens de serviço', 'Assistência'),
  ('os', 'create', 'Criar ordens de serviço', 'Assistência'),
  ('os', 'edit', 'Editar ordens de serviço', 'Assistência'),
  ('clients', 'view', 'Ver clientes', 'Clientes'),
  ('clients', 'create', 'Criar clientes', 'Clientes'),
  ('clients', 'edit', 'Editar clientes', 'Clientes'),
  ('products', 'view', 'Ver produtos', 'Produtos'),
  ('products', 'create', 'Criar produtos', 'Produtos'),
  ('products', 'edit', 'Editar produtos', 'Produtos'),
  ('financial', 'view', 'Ver financeiro', 'Financeiro'),
  ('reports', 'view', 'Ver relatórios', 'Relatórios'),
  ('admin', 'access', 'Acesso administrativo', 'Admin')
ON CONFLICT (resource, action) DO NOTHING;

-- ========== TABELA: user_permissions ==========
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- ========== TABELA: roles ==========
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se não existirem (para tabelas já criadas)
DO $$
BEGIN
  -- Adicionar display_name se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'roles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE roles ADD COLUMN display_name VARCHAR(100);
    -- Atualizar valores existentes
    UPDATE roles SET display_name = INITCAP(name) WHERE display_name IS NULL;
    -- Tornar NOT NULL após atualizar
    ALTER TABLE roles ALTER COLUMN display_name SET NOT NULL;
  END IF;

  -- Adicionar is_system se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'roles' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT false;
  END IF;

  -- Adicionar updated_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'roles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('admin', 'Administrador', 'Administrador do sistema', true),
  ('manager', 'Gerente', 'Gerente', true),
  ('employee', 'Funcionário', 'Funcionário', true),
  ('sales', 'Vendedor', 'Vendedor', true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();

-- ========== TABELA: role_permissions ==========
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- ========== TABELA: user_position_departments ==========
CREATE TABLE IF NOT EXISTS user_position_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== TABELA: kv_store_2c4defad ==========
CREATE TABLE IF NOT EXISTS kv_store_2c4defad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(500) UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kv_store_key ON kv_store_2c4defad(key);

-- ========== TABELA: tasks ==========
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ========== TABELA: clientes ==========
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(50),
  cpf_cnpj VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(50),
  cep VARCHAR(20),
  observacoes TEXT,
  situacao VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);

-- ========== TABELA: produtos ==========
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  codigo VARCHAR(100),
  codigo_barras VARCHAR(100),
  categoria VARCHAR(100),
  preco_custo DECIMAL(15, 2) DEFAULT 0,
  preco_venda DECIMAL(15, 2) DEFAULT 0,
  estoque_atual INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  unidade VARCHAR(20) DEFAULT 'UN',
  situacao VARCHAR(20) DEFAULT 'ativo',
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);

-- ========== TABELA: cash_register_sessions ==========
-- NOTA: Esta tabela já existe com estrutura completa em APPLY_PDV_MIGRATION.sql
-- A tabela real tem: operador_id (não user_id)
-- Não vamos recriar aqui para evitar conflitos. Apenas garantimos que os índices existam.

-- Criar índices apenas se as colunas existirem
DO $$
BEGIN
  -- Índice para operador_id (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_register_sessions' AND column_name = 'operador_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_cash_sessions_operador_id ON cash_register_sessions(operador_id);
  END IF;
  
  -- Índice para user_id (se existir - para compatibilidade)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_register_sessions' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON cash_register_sessions(user_id);
  END IF;
  
  -- Índice para status (sempre existe)
  CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_register_sessions(status);
END $$;

-- ========== TABELA: sales ==========
-- NOTA: Esta tabela já existe com estrutura completa em APPLY_PDV_MIGRATION.sql
-- A tabela real tem: vendedor_id (não user_id)
-- Não vamos recriar aqui para evitar conflitos. Apenas garantimos que os índices existam.

-- Criar índices apenas se as colunas existirem
DO $$
BEGIN
  -- Índice para cliente_id (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'cliente_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sales_cliente ON sales(cliente_id);
  END IF;
  
  -- Índice para vendedor_id (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'vendedor_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sales_vendedor_id ON sales(vendedor_id);
  END IF;
  
  -- Índice para user_id (se existir - para compatibilidade)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
  END IF;
  
  -- Índice para created_at (sempre existe)
  CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
END $$;

-- ========== TABELA: sale_items ==========
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  quantidade INTEGER DEFAULT 1,
  preco_unitario DECIMAL(15, 2) DEFAULT 0,
  desconto DECIMAL(15, 2) DEFAULT 0,
  subtotal DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== TABELA: ordens_servico ==========
-- NOTA: Esta tabela já existe com estrutura completa em APLICAR_MIGRATIONS_FINANCEIRO_OS.sql
-- Não vamos recriar aqui para evitar conflitos. Apenas garantimos que os índices existam.
-- A tabela real tem: vendedor_id, atendente_id, tecnico_id, created_by (não user_id)

CREATE INDEX IF NOT EXISTS idx_os_numero ON ordens_servico(numero);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);

-- ========== TABELA: user_activity_logs ==========
-- NOTA: Esta tabela já existe. Não vamos recriar para evitar conflitos.
-- A estrutura pode variar: algumas versões têm 'action' e 'resource', outras têm 'activity_type' e 'description'
-- Apenas garantimos que os índices existam nas colunas corretas.

-- Criar índices apenas se as colunas existirem
DO $$
BEGIN
  -- Índice para user_id (sempre existe)
  CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_logs(user_id);
  
  -- Índice para action (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_activity_logs' AND column_name = 'action'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_logs(action);
  END IF;
  
  -- Índice para activity_type (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_activity_logs' AND column_name = 'activity_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activity_logs(activity_type);
  END IF;
  
  -- Índice para created_at (sempre existe)
  CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_logs(created_at);
END $$;

-- ========== TABELA: marcas ==========
CREATE TABLE IF NOT EXISTS marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  situacao VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ========== TABELA: modelos ==========
CREATE TABLE IF NOT EXISTS modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID REFERENCES marcas(id),
  nome VARCHAR(255) NOT NULL,
  situacao VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ========== TABELA: financial_categories ==========
-- NOTA: Esta tabela já existe com estrutura completa em APLICAR_TODAS_MIGRATIONS_FINANCEIRO.sql
-- A tabela real usa enum transaction_type com valores 'entrada' e 'saida' (não 'income' e 'expense')
-- Não vamos recriar aqui para evitar conflitos. Apenas inserimos categorias padrão se não existirem.

-- Verificar se o enum existe e criar se necessário
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('entrada', 'saida');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Inserir categorias padrão apenas se não existirem (usando valores corretos do enum)
INSERT INTO financial_categories (name, type, color, icon)
SELECT * FROM (VALUES
  ('Vendas à Vista', 'entrada'::transaction_type, '#22c55e', 'dollar-sign'),
  ('Serviços', 'entrada'::transaction_type, '#3b82f6', 'wrench'),
  ('Outras Receitas', 'entrada'::transaction_type, '#8b5cf6', 'trending-up'),
  ('Fornecedores', 'saida'::transaction_type, '#ef4444', 'truck'),
  ('Despesas Fixas', 'saida'::transaction_type, '#f97316', 'calendar'),
  ('Despesas Variáveis', 'saida'::transaction_type, '#eab308', 'shopping-cart')
) AS v(name, type, color, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM financial_categories WHERE financial_categories.name = v.name
);

-- ========== TABELA: bills_to_pay ==========
CREATE TABLE IF NOT EXISTS bills_to_pay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description VARCHAR(500) NOT NULL,
  category_id UUID REFERENCES financial_categories(id),
  amount DECIMAL(15, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== TABELA: cash_transactions ==========
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id UUID REFERENCES cash_register_sessions(id),
  type VARCHAR(20) NOT NULL, -- 'in', 'out', 'sale', 'withdrawal'
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50),
  description TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== TABELA: os_telegram_photos ==========
-- Tabela para armazenar logs de fotos enviadas para o Telegram
CREATE TABLE IF NOT EXISTS os_telegram_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID REFERENCES ordens_servico(id) ON DELETE CASCADE,
  ordem_servico_numero INTEGER NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT,
  file_id VARCHAR(255), -- File ID do Telegram para reutilização
  message_id INTEGER, -- ID da mensagem no Telegram
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'processo')),
  telegram_chat_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processando' CHECK (status IN ('enviado', 'erro', 'processando')),
  error_message TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_os_id ON os_telegram_photos(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_os_numero ON os_telegram_photos(ordem_servico_numero);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_tipo ON os_telegram_photos(tipo);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_status ON os_telegram_photos(status);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_chat_id ON os_telegram_photos(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_message_id ON os_telegram_photos(message_id);

-- ========== TABELA: telegram_config ==========
-- Tabela para armazenar configurações globais do Telegram (chat IDs padrão)
CREATE TABLE IF NOT EXISTS telegram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_config_key ON telegram_config(key);

-- Inserir configurações padrão de chat IDs
INSERT INTO telegram_config (key, value, description) VALUES
  ('chat_id_entrada', '', 'Chat ID padrão do Telegram para fotos de entrada'),
  ('chat_id_processo', '', 'Chat ID padrão do Telegram para fotos de processo'),
  ('chat_id_saida', '', 'Chat ID padrão do Telegram para fotos de saída')
ON CONFLICT (key) DO NOTHING;

-- ========== TABELA: telegram_messages ==========
-- Tabela para armazenar histórico de mensagens enviadas ao Telegram
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id VARCHAR(100) NOT NULL,
  message_id INTEGER NOT NULL,
  ordem_servico_id UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  ordem_servico_numero INTEGER,
  tipo VARCHAR(20) CHECK (tipo IN ('entrada', 'saida', 'processo', 'notificacao', 'outro')),
  content_type VARCHAR(50) DEFAULT 'photo', -- photo, document, text, etc
  file_id VARCHAR(255),
  caption TEXT,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'deleted', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id ON telegram_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_message_id ON telegram_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_os_id ON telegram_messages(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_os_numero ON telegram_messages(ordem_servico_numero);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_status ON telegram_messages(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_messages_unique ON telegram_messages(chat_id, message_id);

-- ========== TRIGGERS para updated_at ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger às tabelas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_position_departments', 'kv_store_2c4defad', 'tasks', 'clientes', 'produtos', 'cash_register_sessions', 'sales', 'ordens_servico', 'bills_to_pay', 'os_telegram_photos', 'telegram_config']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I ON %I;
      CREATE TRIGGER trigger_update_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ========== VERIFICAÇÃO FINAL ==========
SELECT 'Tabelas criadas com sucesso!' as resultado;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

