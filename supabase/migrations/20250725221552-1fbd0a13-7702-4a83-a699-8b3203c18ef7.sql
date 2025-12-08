-- Criar tabela de cargos/posições
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1, -- níveis hierárquicos
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para positions
CREATE POLICY "Anyone can view positions" 
ON public.positions 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage positions" 
ON public.positions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Tabela para relacionar usuários com cargos e departamentos
CREATE TABLE public.user_position_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false, -- cargo principal do usuário
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, position_id, department_name)
);

-- Habilitar RLS
ALTER TABLE public.user_position_departments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_position_departments
CREATE POLICY "Admins can manage user positions" 
ON public.user_position_departments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can view their own positions" 
ON public.user_position_departments 
FOR SELECT 
USING (user_id = auth.uid());

-- Adicionar trigger para updated_at em positions
CREATE TRIGGER update_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar a constraint de categorias para permitir duplicatas (o erro era uma constraint única desnecessária)
-- Como não podemos alterar constraints existentes facilmente, vamos criar um índice único composto
-- Primeiro, vamos verificar se existe constraint única no nome
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categories_name_key' 
        AND table_name = 'categories'
    ) THEN
        ALTER TABLE public.categories DROP CONSTRAINT categories_name_key;
    END IF;
END $$;

-- Permitir nomes de categoria duplicados (podem ser organizados por departamento ou criador)
-- Não adicionar nova constraint única pois categorias podem ter nomes similares para departamentos diferentes