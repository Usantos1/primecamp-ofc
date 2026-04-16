-- ============================================================================
-- REFATORAÇÃO COMPLETA DO SISTEMA DE PERMISSÕES - AtivaFIX v2
-- Execute este script no PostgreSQL da VPS
-- ============================================================================
-- IMPORTANTE: Este script é IDEMPOTENTE (pode rodar várias vezes sem problema)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. GARANTIR QUE AS TABELAS EXISTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource, action)
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  segmento_slug VARCHAR(100),
  home_path VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- Garantir colunas extras em roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='display_name') THEN
    ALTER TABLE roles ADD COLUMN display_name VARCHAR(100);
    UPDATE roles SET display_name = INITCAP(name) WHERE display_name IS NULL;
    ALTER TABLE roles ALTER COLUMN display_name SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='is_system') THEN
    ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='segmento_slug') THEN
    ALTER TABLE roles ADD COLUMN segmento_slug VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='home_path') THEN
    ALTER TABLE roles ADD COLUMN home_path VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='updated_at') THEN
    ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- 2. REMOVER PERMISSÕES OBSOLETAS (processos, NPS, treinamentos, tarefas, calendário)
-- ============================================================================

DELETE FROM role_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE resource IN (
    'processes', 'nps', 'training', 'treinamento', 'academy',
    'tasks', 'calendario', 'tarefas'
  )
);

DELETE FROM user_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE resource IN (
    'processes', 'nps', 'training', 'treinamento', 'academy',
    'tasks', 'calendario', 'tarefas'
  )
);

DELETE FROM permissions WHERE resource IN (
  'processes', 'nps', 'training', 'treinamento', 'academy',
  'tasks', 'calendario', 'tarefas'
);

-- Remover permissões com nomes inglês antigos que causam duplicidade
-- (vamos padronizar para os nomes usados no frontend)
DELETE FROM role_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE resource IN (
    'sales', 'customers', 'service_orders', 'products', 'users', 'settings'
  )
);
DELETE FROM user_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE resource IN (
    'sales', 'customers', 'service_orders', 'products', 'users', 'settings'
  )
);
DELETE FROM permissions WHERE resource IN (
  'sales', 'customers', 'service_orders', 'products', 'users', 'settings'
);

-- Remover a permissão legada 'ordens_servico' se existir
DELETE FROM role_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE resource = 'ordens_servico'
);
DELETE FROM user_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE resource = 'ordens_servico'
);
DELETE FROM permissions WHERE resource = 'ordens_servico';

-- Remover 'clients' (usaremos 'clientes')
DELETE FROM role_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE resource = 'clients'
);
DELETE FROM user_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE resource = 'clients'
);
DELETE FROM permissions WHERE resource = 'clients';

-- ============================================================================
-- 3. INSERIR NOVA MATRIZ DE PERMISSÕES PADRONIZADA
-- ============================================================================

INSERT INTO permissions (resource, action, description, category) VALUES
  -- Dashboard
  ('dashboard', 'view', 'Visualizar dashboard', 'dashboard'),
  ('dashboard', 'gestao', 'Dashboard de gestão', 'dashboard'),

  -- Vendas / PDV
  ('vendas', 'view', 'Visualizar vendas', 'vendas'),
  ('vendas', 'create', 'Criar vendas', 'vendas'),
  ('vendas', 'edit', 'Editar vendas', 'vendas'),
  ('vendas', 'manage', 'Gerenciar vendas (devoluções, cupom)', 'vendas'),
  ('vendas', 'delete', 'Excluir vendas', 'vendas'),

  -- Caixa
  ('caixa', 'view', 'Visualizar caixa', 'caixa'),
  ('caixa', 'open', 'Abrir caixa', 'caixa'),
  ('caixa', 'close', 'Fechar caixa', 'caixa'),
  ('caixa', 'sangria', 'Realizar sangria', 'caixa'),
  ('caixa', 'suprimento', 'Realizar suprimento', 'caixa'),

  -- Ordem de Serviço
  ('os', 'view', 'Visualizar ordens de serviço', 'os'),
  ('os', 'create', 'Criar ordens de serviço', 'os'),
  ('os', 'edit', 'Editar ordens de serviço', 'os'),
  ('os', 'delete', 'Excluir ordens de serviço', 'os'),
  ('os', 'config.status', 'Configurar status de OS', 'os'),

  -- Clientes
  ('clientes', 'view', 'Visualizar clientes', 'clientes'),
  ('clientes', 'create', 'Cadastrar clientes', 'clientes'),
  ('clientes', 'edit', 'Editar clientes', 'clientes'),
  ('clientes', 'delete', 'Excluir clientes', 'clientes'),

  -- Produtos / Estoque
  ('produtos', 'view', 'Visualizar produtos', 'produtos'),
  ('produtos', 'create', 'Cadastrar produtos', 'produtos'),
  ('produtos', 'edit', 'Editar produtos', 'produtos'),
  ('produtos', 'manage', 'Gerenciar estoque (marcas, modelos, inventário)', 'produtos'),

  -- Financeiro
  ('financeiro', 'view', 'Visualizar financeiro', 'financeiro'),
  ('financeiro', 'create', 'Criar lançamentos financeiros', 'financeiro'),
  ('financeiro', 'edit', 'Editar lançamentos financeiros', 'financeiro'),
  ('financeiro', 'delete', 'Excluir lançamentos financeiros', 'financeiro'),

  -- Relatórios
  ('relatorios', 'view', 'Visualizar relatórios', 'relatorios'),
  ('relatorios', 'vendas', 'Relatórios de vendas', 'relatorios'),
  ('relatorios', 'financeiro', 'Relatórios financeiros', 'relatorios'),
  ('relatorios', 'geral', 'Relatórios gerais', 'relatorios'),

  -- Pós-venda
  ('pos_venda', 'view', 'Visualizar pós-venda', 'pos_venda'),
  ('pos_venda', 'manage', 'Gerenciar mensagens de pós-venda', 'pos_venda'),
  ('pos_venda', 'config', 'Configurar pós-venda', 'pos_venda'),

  -- Alertas
  ('alertas', 'view', 'Visualizar painel de alertas', 'alertas'),
  ('alertas', 'config', 'Configurar alertas', 'alertas'),

  -- Administração
  ('admin', 'view', 'Acesso administrativo geral', 'admin'),
  ('admin', 'config', 'Configurações do sistema', 'admin'),
  ('admin', 'users', 'Gerenciar usuários', 'admin'),
  ('admin', 'logs', 'Visualizar logs do sistema', 'admin'),
  ('admin', 'timeclock', 'Administrar ponto eletrônico', 'admin'),
  ('admin', 'disc', 'Administrar avaliação DISC', 'admin'),

  -- RH / Gestão
  ('rh', 'view', 'Visualizar RH', 'rh'),
  ('rh', 'ponto', 'Registrar ponto eletrônico', 'rh'),
  ('rh', 'manage', 'Gerenciar equipe e departamentos', 'rh')

ON CONFLICT (resource, action) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================================================
-- 4. INSERIR CARGOS PADRÃO
-- ============================================================================

INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('admin', 'Administrador', 'Acesso total ao sistema', true),
  ('gerente', 'Gerente', 'Gestão completa da operação, sem configurações críticas', true),
  ('vendedor', 'Vendedor', 'Vendas, atendimento ao cliente e acompanhamento de pós-venda', true),
  ('tecnico', 'Técnico', 'Ordens de serviço e produtos', true),
  ('financeiro', 'Financeiro', 'Relatórios financeiros e contas', true),
  ('atendente', 'Atendente', 'Atendimento, vendas simples e OS', true),
  ('visualizador', 'Visualizador', 'Apenas visualização dos módulos permitidos', true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();

-- Manter manager/employee/sales como alias para os novos nomes se já existirem
UPDATE roles SET display_name = 'Gerente', description = 'Gestão completa da operação', is_system = true
  WHERE name = 'manager' AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'gerente');
UPDATE roles SET display_name = 'Vendedor', description = 'Vendas e atendimento', is_system = true
  WHERE name = 'sales' AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'vendedor');
UPDATE roles SET display_name = 'Funcionário', description = 'Funcionário padrão', is_system = true
  WHERE name = 'employee';

-- ============================================================================
-- 5. DISTRIBUIR PERMISSÕES POR CARGO
-- ============================================================================

-- Limpar role_permissions dos cargos do sistema para redistribuir
DELETE FROM role_permissions WHERE role_id IN (
  SELECT id FROM roles WHERE name IN ('admin','gerente','vendedor','tecnico','financeiro','atendente','visualizador')
);

-- GERENTE: quase tudo exceto config críticas e exclusões
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'gerente' AND (p.resource || '.' || p.action) IN (
  'dashboard.view', 'dashboard.gestao',
  'vendas.view', 'vendas.create', 'vendas.edit', 'vendas.manage',
  'caixa.view', 'caixa.open', 'caixa.close', 'caixa.sangria', 'caixa.suprimento',
  'os.view', 'os.create', 'os.edit', 'os.delete', 'os.config.status',
  'clientes.view', 'clientes.create', 'clientes.edit',
  'produtos.view', 'produtos.create', 'produtos.edit', 'produtos.manage',
  'financeiro.view', 'financeiro.create', 'financeiro.edit',
  'relatorios.view', 'relatorios.vendas', 'relatorios.financeiro', 'relatorios.geral',
  'pos_venda.view', 'pos_venda.manage', 'pos_venda.config',
  'alertas.view', 'alertas.config',
  'admin.users', 'admin.view',
  'rh.view', 'rh.ponto', 'rh.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- VENDEDOR: vendas, clientes, OS básica, pós-venda visualização
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'vendedor' AND (p.resource || '.' || p.action) IN (
  'dashboard.view',
  'vendas.view', 'vendas.create',
  'caixa.view',
  'os.view', 'os.create',
  'clientes.view', 'clientes.create', 'clientes.edit',
  'produtos.view',
  'pos_venda.view',
  'rh.ponto'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- TÉCNICO: OS completa, produtos, clientes visualização
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'tecnico' AND (p.resource || '.' || p.action) IN (
  'dashboard.view',
  'os.view', 'os.create', 'os.edit',
  'produtos.view', 'produtos.edit',
  'clientes.view',
  'rh.ponto'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- FINANCEIRO: relatórios, financeiro, caixa visualização
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'financeiro' AND (p.resource || '.' || p.action) IN (
  'dashboard.view', 'dashboard.gestao',
  'vendas.view',
  'caixa.view',
  'financeiro.view', 'financeiro.create', 'financeiro.edit',
  'relatorios.view', 'relatorios.vendas', 'relatorios.financeiro', 'relatorios.geral',
  'alertas.view',
  'clientes.view',
  'rh.ponto'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ATENDENTE: atendimento, vendas simples, OS básica
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'atendente' AND (p.resource || '.' || p.action) IN (
  'dashboard.view',
  'vendas.view', 'vendas.create',
  'caixa.view',
  'os.view', 'os.create',
  'clientes.view', 'clientes.create',
  'produtos.view',
  'pos_venda.view',
  'rh.ponto'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- VISUALIZADOR: apenas leitura
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'visualizador' AND (p.resource || '.' || p.action) IN (
  'dashboard.view',
  'vendas.view',
  'caixa.view',
  'os.view',
  'clientes.view',
  'produtos.view',
  'rh.ponto'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 6. VERIFICAÇÃO
-- ============================================================================

SELECT 'Permissões ativas:' AS info, count(*) AS total FROM permissions;
SELECT 'Cargos do sistema:' AS info, count(*) AS total FROM roles WHERE is_system = true;
SELECT r.display_name AS cargo, count(rp.id) AS permissoes
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE r.is_system = true
GROUP BY r.display_name
ORDER BY permissoes DESC;

COMMIT;
