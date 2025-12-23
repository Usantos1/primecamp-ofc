-- ============================================
-- POPULAR PERMISSÕES INICIAIS DO SISTEMA
-- ============================================

-- PDV - VENDAS
INSERT INTO public.permissions (resource, action, description, category) VALUES
('vendas', 'view', 'Ver lista de vendas', 'pdv'),
('vendas', 'create', 'Criar nova venda', 'pdv'),
('vendas', 'edit', 'Editar venda existente', 'pdv'),
('vendas', 'delete', 'Deletar venda', 'pdv'),
('vendas', 'manage', 'Gerenciar tudo de vendas (inclui configurações)', 'pdv')
ON CONFLICT (resource, action) DO NOTHING;

-- PDV - CAIXA
INSERT INTO public.permissions (resource, action, description, category) VALUES
('caixa', 'view', 'Ver informações do caixa', 'pdv'),
('caixa', 'open', 'Abrir caixa', 'pdv'),
('caixa', 'close', 'Fechar caixa', 'pdv'),
('caixa', 'manage', 'Gerenciar tudo de caixa', 'pdv')
ON CONFLICT (resource, action) DO NOTHING;

-- PDV - FINANCEIRO
INSERT INTO public.permissions (resource, action, description, category) VALUES
('financeiro', 'view', 'Ver informações financeiras', 'pdv'),
('financeiro', 'manage', 'Gerenciar financeiro (valores, relatórios)', 'pdv')
ON CONFLICT (resource, action) DO NOTHING;

-- PDV - RELATÓRIOS
INSERT INTO public.permissions (resource, action, description, category) VALUES
('relatorios', 'vendas', 'Ver relatórios de vendas', 'pdv'),
('relatorios', 'financeiro', 'Ver relatórios financeiros', 'pdv'),
('relatorios', 'geral', 'Ver relatórios gerais', 'pdv')
ON CONFLICT (resource, action) DO NOTHING;

-- ASSISTÊNCIA - OS
INSERT INTO public.permissions (resource, action, description, category) VALUES
('os', 'view', 'Ver lista de OS', 'assistencia'),
('os', 'create', 'Criar nova OS', 'assistencia'),
('os', 'edit', 'Editar OS existente', 'assistencia'),
('os', 'delete', 'Deletar OS', 'assistencia'),
('os', 'manage', 'Gerenciar tudo de OS (inclui configurações)', 'assistencia')
ON CONFLICT (resource, action) DO NOTHING;

-- ASSISTÊNCIA - PRODUTOS
INSERT INTO public.permissions (resource, action, description, category) VALUES
('produtos', 'view', 'Ver produtos', 'assistencia'),
('produtos', 'create', 'Criar produto', 'assistencia'),
('produtos', 'edit', 'Editar produto', 'assistencia'),
('produtos', 'delete', 'Deletar produto', 'assistencia'),
('produtos', 'manage', 'Gerenciar produtos', 'assistencia')
ON CONFLICT (resource, action) DO NOTHING;

-- ASSISTÊNCIA - CONFIGURAÇÕES
INSERT INTO public.permissions (resource, action, description, category) VALUES
('os.config', 'status', 'Configurar status de OS', 'assistencia'),
('os.config', 'checklist', 'Configurar checklist', 'assistencia'),
('os.config', 'imagem', 'Configurar imagem de referência', 'assistencia')
ON CONFLICT (resource, action) DO NOTHING;

-- CLIENTES
INSERT INTO public.permissions (resource, action, description, category) VALUES
('clientes', 'view', 'Ver clientes', 'clientes'),
('clientes', 'create', 'Criar cliente', 'clientes'),
('clientes', 'edit', 'Editar cliente', 'clientes'),
('clientes', 'delete', 'Deletar cliente', 'clientes'),
('clientes', 'manage', 'Gerenciar clientes', 'clientes')
ON CONFLICT (resource, action) DO NOTHING;

-- ADMINISTRAÇÃO
INSERT INTO public.permissions (resource, action, description, category) VALUES
('admin', 'users', 'Gerenciar usuários', 'admin'),
('admin', 'roles', 'Gerenciar roles', 'admin'),
('admin', 'departments', 'Gerenciar departamentos', 'admin'),
('admin', 'positions', 'Gerenciar cargos', 'admin'),
('admin', 'config', 'Configurações do sistema', 'admin'),
('admin', 'logs', 'Ver logs do sistema', 'admin')
ON CONFLICT (resource, action) DO NOTHING;

-- RH
INSERT INTO public.permissions (resource, action, description, category) VALUES
('rh', 'view', 'Ver módulo RH', 'rh'),
('rh', 'ponto', 'Acessar ponto eletrônico', 'rh'),
('rh', 'metas', 'Ver/gerenciar metas', 'rh'),
('rh', 'treinamentos', 'Acessar treinamentos', 'rh'),
('rh', 'manage', 'Gerenciar tudo de RH', 'rh')
ON CONFLICT (resource, action) DO NOTHING;

-- PROCESSOS E TAREFAS
INSERT INTO public.permissions (resource, action, description, category) VALUES
('processos', 'view', 'Ver processos', 'gestao'),
('processos', 'create', 'Criar processo', 'gestao'),
('processos', 'edit', 'Editar processo', 'gestao'),
('processos', 'delete', 'Deletar processo', 'gestao'),
('tarefas', 'view', 'Ver tarefas', 'gestao'),
('tarefas', 'manage', 'Gerenciar tarefas', 'gestao')
ON CONFLICT (resource, action) DO NOTHING;

-- DASHBOARD E RELATÓRIOS GERAIS
INSERT INTO public.permissions (resource, action, description, category) VALUES
('dashboard', 'view', 'Ver dashboard principal', 'gestao'),
('dashboard', 'gestao', 'Ver dashboard de gestão', 'gestao'),
('calendario', 'view', 'Ver calendário', 'gestao'),
('metricas', 'view', 'Ver métricas', 'gestao')
ON CONFLICT (resource, action) DO NOTHING;

