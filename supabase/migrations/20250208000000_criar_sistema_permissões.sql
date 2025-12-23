-- ============================================
-- SISTEMA DE PERMISSÕES GRANULARES
-- ============================================

-- 1. Tabela de Permissões
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,           -- 'vendas', 'os', 'clientes', etc
  action TEXT NOT NULL,             -- 'view', 'create', 'edit', 'delete', 'manage'
  description TEXT NOT NULL,
  category TEXT NOT NULL,           -- 'pdv', 'assistencia', 'admin', 'rh'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource, action)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON public.permissions(resource, action);

-- 2. Tabela de Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,        -- 'admin', 'vendedor', 'tecnico', etc
  display_name TEXT NOT NULL,       -- 'Administrador', 'Vendedor', etc
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- Roles do sistema não podem ser deletados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Relacionamento Role-Permissões
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- 4. Tabela de Permissões Customizadas por Usuário
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,     -- true = permitido, false = negado (override)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);

-- 5. Atualizar user_position_departments para incluir role_id
ALTER TABLE public.user_position_departments
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);

CREATE INDEX IF NOT EXISTS idx_user_position_departments_role_id ON public.user_position_departments(role_id);

-- 6. Trigger para updated_at em roles
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_roles_updated_at ON public.roles;
CREATE TRIGGER trigger_update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_updated_at();

-- 7. Função para verificar permissões
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _resource TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Verificar se é admin (tem acesso total)
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- 2. Verificar permissões customizadas negadas (override - tem prioridade)
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id 
      AND p.resource = _resource 
      AND p.action = _action
      AND up.granted = false
  ) THEN
    RETURN false; -- Negado explicitamente
  END IF;

  -- 3. Verificar permissões customizadas concedidas (override)
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id 
      AND p.resource = _resource 
      AND p.action = _action
      AND up.granted = true
  ) THEN
    RETURN true; -- Permitido explicitamente
  END IF;

  -- 4. Verificar permissões via role
  IF EXISTS (
    SELECT 1 FROM public.user_position_departments upd
    JOIN public.role_permissions rp ON rp.role_id = upd.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE upd.user_id = _user_id
      AND p.resource = _resource
      AND p.action = _action
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 8. RLS Policies

-- Permissions: Todos autenticados podem ver, apenas admins podem gerenciar
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver permissões"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar permissões"
  ON public.permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Roles: Todos autenticados podem ver, apenas admins podem gerenciar
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar roles"
  ON public.roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Role Permissions: Todos autenticados podem ver, apenas admins podem gerenciar
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver role_permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar role_permissions"
  ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User Permissions: Usuários podem ver suas próprias, admins podem gerenciar todas
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias permissões"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem ver todas as permissões de usuários"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem gerenciar user_permissions"
  ON public.user_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Comentários
COMMENT ON TABLE public.permissions IS 'Permissões granulares do sistema (resource.action)';
COMMENT ON TABLE public.roles IS 'Roles predefinidos do sistema (templates de permissões)';
COMMENT ON TABLE public.role_permissions IS 'Relacionamento entre roles e permissões';
COMMENT ON TABLE public.user_permissions IS 'Permissões customizadas por usuário (override)';
COMMENT ON FUNCTION public.has_permission IS 'Verifica se um usuário tem uma permissão específica';

