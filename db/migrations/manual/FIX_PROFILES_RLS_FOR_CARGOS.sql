-- ============================================
-- CORRIGIR RLS DA TABELA PROFILES PARA USO EM CARGOS/TÉCNICOS
-- ============================================
-- Execute este SQL no Supabase SQL Editor ou via CLI
-- Isso permite que usuários autenticados vejam todos os perfis para listar técnicos/colaboradores

-- Permitir que usuários autenticados vejam todos os perfis (campos básicos)
-- Remover política antiga se existir
DROP POLICY IF EXISTS "Authenticated users can view all profiles for cargos" ON public.profiles;

-- Criar política que permite usuários autenticados verem todos os perfis
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

-- Habilitar RLS
ALTER TABLE IF EXISTS public.user_position_departments ENABLE ROW LEVEL SECURITY;

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

-- Habilitar RLS
ALTER TABLE IF EXISTS public.positions ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Authenticated users can view positions for cargos" ON public.positions;

-- Criar política que permite usuários autenticados verem todas as posições
CREATE POLICY "Authenticated users can view positions for cargos" 
ON public.positions 
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON POLICY "Authenticated users can view all profiles for cargos" ON public.profiles IS 
'Permite que usuários autenticados vejam todos os perfis para uso em listas de técnicos/colaboradores';

COMMENT ON POLICY "Authenticated users can view user positions for cargos" ON public.user_position_departments IS 
'Permite que usuários autenticados vejam todas as posições dos usuários para identificar técnicos';

COMMENT ON POLICY "Authenticated users can view positions for cargos" ON public.positions IS 
'Permite que usuários autenticados vejam todas as posições cadastradas';

