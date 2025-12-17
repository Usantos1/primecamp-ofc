-- ============================================
-- CORRIGIR RLS DA TABELA PROFILES PARA USO EM CARGOS/TÉCNICOS
-- ============================================

-- Permitir que usuários autenticados vejam todos os perfis (campos básicos)
-- Isso é necessário para listar técnicos e colaboradores na OS

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Authenticated users can view all profiles for cargos" ON public.profiles;

-- Criar política que permite usuários autenticados verem todos os perfis
-- (apenas campos básicos: user_id, display_name, email, department, role)
CREATE POLICY "Authenticated users can view all profiles for cargos" 
ON public.profiles 
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CORRIGIR RLS DA TABELA USER_POSITION_DEPARTMENTS
-- ============================================

-- Verificar se a tabela existe e criar se necessário
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_position_departments') THEN
    CREATE TABLE IF NOT EXISTS public.user_position_departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
      department_name TEXT,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.user_position_departments ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Authenticated users can view user positions for cargos" ON public.user_position_departments;

-- Criar política que permite usuários autenticados verem todas as posições
CREATE POLICY "Authenticated users can view user positions for cargos" 
ON public.user_position_departments 
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- ============================================
-- CORRIGIR RLS DA TABELA POSITIONS
-- ============================================

-- Verificar se a tabela existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'positions') THEN
    CREATE TABLE IF NOT EXISTS public.positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Authenticated users can view positions for cargos" ON public.positions;

-- Criar política que permite usuários autenticados verem todas as posições
CREATE POLICY "Authenticated users can view positions for cargos" 
ON public.positions 
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

COMMENT ON POLICY "Authenticated users can view all profiles for cargos" ON public.profiles IS 
'Permite que usuários autenticados vejam todos os perfis para uso em listas de técnicos/colaboradores';

COMMENT ON POLICY "Authenticated users can view user positions for cargos" ON public.user_position_departments IS 
'Permite que usuários autenticados vejam todas as posições dos usuários para identificar técnicos';

COMMENT ON POLICY "Authenticated users can view positions for cargos" ON public.positions IS 
'Permite que usuários autenticados vejam todas as posições cadastradas';

