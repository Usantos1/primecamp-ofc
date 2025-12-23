-- ============================================
-- CRIAR ROLES PREDEFINIDOS E ATRIBUIR PERMISSÕES
-- ============================================

-- 1. ADMIN - Acesso total
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('admin', 'Administrador', 'Acesso total ao sistema', true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, is_system = true;

-- 2. GERENTE - Acesso a relatórios e gestão (sem admin)
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('gerente', 'Gerente', 'Acesso a relatórios, gestão e processos (sem configurações de admin)', true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, is_system = true;

-- 3. VENDEDOR - Apenas vendas e clientes (sem financeiro)
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('vendedor', 'Vendedor', 'Apenas vendas e clientes (sem acesso a financeiro)', true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, is_system = true;

-- 4. TÉCNICO - Apenas OS e produtos
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('tecnico', 'Técnico', 'Apenas ordens de serviço e produtos (sem vendas)', true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, is_system = true;

-- 5. ATENDENTE - OS, clientes, produtos (sem configurações)
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('atendente', 'Atendente', 'OS, clientes e produtos (sem configurações)', true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, is_system = true;

-- 6. FINANCEIRO - Vendas, caixa, relatórios financeiros
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('financeiro', 'Financeiro', 'Vendas (visualização), caixa e relatórios financeiros', true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, is_system = true;

-- 7. RH - Apenas módulo RH
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('rh', 'Recursos Humanos', 'Apenas módulo RH (ponto, metas, treinamentos)', true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, is_system = true;

-- 8. VISUALIZADOR - Apenas visualização (sem edição)
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('visualizador', 'Visualizador', 'Apenas visualização (sem permissões de edição)', true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, is_system = true;

-- ============================================
-- ATRIBUIR PERMISSÕES AOS ROLES
-- ============================================

-- ADMIN: Todas as permissões
DO $$
DECLARE
  admin_role_id UUID;
  perm RECORD;
BEGIN
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  
  FOR perm IN SELECT id FROM public.permissions
  LOOP
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (admin_role_id, perm.id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;

-- GERENTE: Dashboard, processos, tarefas, relatórios, métricas, calendário
DO $$
DECLARE
  gerente_role_id UUID;
BEGIN
  SELECT id INTO gerente_role_id FROM public.roles WHERE name = 'gerente';
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT gerente_role_id, p.id
  FROM public.permissions p
  WHERE p.resource IN ('dashboard', 'processos', 'tarefas', 'calendario', 'metricas')
     OR p.resource = 'relatorios'
     OR (p.resource = 'vendas' AND p.action = 'view')
     OR (p.resource = 'os' AND p.action = 'view')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- VENDEDOR: Vendas (sem delete/manage), clientes, caixa (view apenas)
DO $$
DECLARE
  vendedor_role_id UUID;
BEGIN
  SELECT id INTO vendedor_role_id FROM public.roles WHERE name = 'vendedor';
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT vendedor_role_id, p.id
  FROM public.permissions p
  WHERE (p.resource = 'vendas' AND p.action IN ('view', 'create', 'edit'))
     OR (p.resource = 'clientes' AND p.action IN ('view', 'create', 'edit'))
     OR (p.resource = 'caixa' AND p.action = 'view')
     OR (p.resource = 'dashboard' AND p.action = 'view')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- TÉCNICO: OS, produtos, clientes (view apenas)
DO $$
DECLARE
  tecnico_role_id UUID;
BEGIN
  SELECT id INTO tecnico_role_id FROM public.roles WHERE name = 'tecnico';
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT tecnico_role_id, p.id
  FROM public.permissions p
  WHERE (p.resource = 'os' AND p.action IN ('view', 'create', 'edit'))
     OR (p.resource = 'produtos' AND p.action IN ('view', 'create', 'edit'))
     OR (p.resource = 'clientes' AND p.action = 'view')
     OR (p.resource = 'dashboard' AND p.action = 'view')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- ATENDENTE: OS, clientes, produtos (sem configurações)
DO $$
DECLARE
  atendente_role_id UUID;
BEGIN
  SELECT id INTO atendente_role_id FROM public.roles WHERE name = 'atendente';
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT atendente_role_id, p.id
  FROM public.permissions p
  WHERE (p.resource = 'os' AND p.action IN ('view', 'create', 'edit'))
     OR (p.resource = 'clientes' AND p.action IN ('view', 'create', 'edit'))
     OR (p.resource = 'produtos' AND p.action IN ('view', 'create', 'edit'))
     OR (p.resource = 'dashboard' AND p.action = 'view')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- FINANCEIRO: Vendas (view), caixa, financeiro, relatórios
DO $$
DECLARE
  financeiro_role_id UUID;
BEGIN
  SELECT id INTO financeiro_role_id FROM public.roles WHERE name = 'financeiro';
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT financeiro_role_id, p.id
  FROM public.permissions p
  WHERE (p.resource = 'vendas' AND p.action = 'view')
     OR p.resource = 'caixa'
     OR p.resource = 'financeiro'
     OR p.resource = 'relatorios'
     OR (p.resource = 'dashboard' AND p.action = 'view')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- RH: Apenas módulo RH
DO $$
DECLARE
  rh_role_id UUID;
BEGIN
  SELECT id INTO rh_role_id FROM public.roles WHERE name = 'rh';
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT rh_role_id, p.id
  FROM public.permissions p
  WHERE p.resource = 'rh'
     OR (p.resource = 'dashboard' AND p.action = 'view')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- VISUALIZADOR: Apenas view em tudo (sem create/edit/delete)
DO $$
DECLARE
  visualizador_role_id UUID;
BEGIN
  SELECT id INTO visualizador_role_id FROM public.roles WHERE name = 'visualizador';
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT visualizador_role_id, p.id
  FROM public.permissions p
  WHERE p.action = 'view'
     OR (p.resource = 'relatorios')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

