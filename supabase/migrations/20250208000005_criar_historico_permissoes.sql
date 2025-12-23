-- ============================================
-- CRIAR TABELA DE HISTÓRICO DE ALTERAÇÕES DE PERMISSÕES
-- ============================================

CREATE TABLE IF NOT EXISTS public.permission_changes_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  change_type TEXT NOT NULL, -- 'role_assigned', 'role_removed', 'permission_granted', 'permission_denied', 'role_created', 'role_updated', 'role_deleted'
  resource TEXT, -- Para mudanças de permissão específica
  action TEXT, -- Para mudanças de permissão específica
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL, -- Para mudanças de role
  role_name TEXT, -- Nome do role (para histórico mesmo se role for deletado)
  old_value TEXT, -- Valor anterior (JSON string)
  new_value TEXT, -- Novo valor (JSON string)
  description TEXT, -- Descrição da mudança
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_permission_changes_user_id ON public.permission_changes_history(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_changes_changed_by ON public.permission_changes_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_permission_changes_created_at ON public.permission_changes_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_changes_role_id ON public.permission_changes_history(role_id) WHERE role_id IS NOT NULL;

-- RLS
ALTER TABLE public.permission_changes_history ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver o histórico
CREATE POLICY "Apenas admins podem ver histórico de permissões"
  ON public.permission_changes_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admins podem inserir no histórico
CREATE POLICY "Apenas admins podem inserir histórico de permissões"
  ON public.permission_changes_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.permission_changes_history IS 'Histórico de todas as alterações de permissões e roles de usuários';
COMMENT ON COLUMN public.permission_changes_history.change_type IS 'Tipo de mudança: role_assigned, role_removed, permission_granted, permission_denied, role_created, role_updated, role_deleted';
COMMENT ON COLUMN public.permission_changes_history.old_value IS 'Valor anterior em formato JSON';
COMMENT ON COLUMN public.permission_changes_history.new_value IS 'Novo valor em formato JSON';


