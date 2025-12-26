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
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador do sistema'),
  ('manager', 'Gerente'),
  ('employee', 'Funcionário'),
  ('sales', 'Vendedor')
ON CONFLICT (name) DO NOTHING;

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
CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  closing_balance DECIMAL(15, 2),
  expected_balance DECIMAL(15, 2),
  difference DECIMAL(15, 2),
  status VARCHAR(20) DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON cash_register_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_register_sessions(status);

-- ========== TABELA: sales ==========
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  user_id UUID NOT NULL REFERENCES users(id),
  cash_session_id UUID REFERENCES cash_register_sessions(id),
  total DECIMAL(15, 2) DEFAULT 0,
  desconto DECIMAL(15, 2) DEFAULT 0,
  total_final DECIMAL(15, 2) DEFAULT 0,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_cliente ON sales(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);

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
CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50),
  cliente_id UUID REFERENCES clientes(id),
  user_id UUID REFERENCES users(id),
  tecnico_id UUID REFERENCES users(id),
  equipamento VARCHAR(255),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  numero_serie VARCHAR(100),
  defeito_relatado TEXT,
  diagnostico TEXT,
  solucao TEXT,
  status VARCHAR(50) DEFAULT 'aberta',
  prioridade VARCHAR(20) DEFAULT 'normal',
  valor_orcamento DECIMAL(15, 2),
  valor_final DECIMAL(15, 2),
  data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_previsao TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_numero ON ordens_servico(numero);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);

-- ========== TABELA: user_activity_logs ==========
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id UUID,
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_logs(created_at);

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
CREATE TABLE IF NOT EXISTS financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'income' ou 'expense'
  color VARCHAR(20),
  icon VARCHAR(50),
  parent_id UUID REFERENCES financial_categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO financial_categories (name, type, color) VALUES
  ('Vendas', 'income', '#22c55e'),
  ('Serviços', 'income', '#3b82f6'),
  ('Outros', 'income', '#8b5cf6'),
  ('Fornecedores', 'expense', '#ef4444'),
  ('Despesas Fixas', 'expense', '#f97316'),
  ('Despesas Variáveis', 'expense', '#eab308')
ON CONFLICT DO NOTHING;

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
  FOREACH t IN ARRAY ARRAY['user_position_departments', 'kv_store_2c4defad', 'tasks', 'clientes', 'produtos', 'cash_register_sessions', 'sales', 'ordens_servico', 'bills_to_pay']
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

