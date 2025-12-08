-- Criar tabela de categorias
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📁',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
CREATE POLICY "Anyone can view categories" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can update categories" 
ON public.categories 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can delete categories" 
ON public.categories 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Adicionar campo category_id na tabela processes
ALTER TABLE public.processes 
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Trigger para updated_at em categories
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir algumas categorias padrão
INSERT INTO public.categories (name, description, color, icon, created_by) VALUES 
('Vendas', 'Processos relacionados ao departamento de vendas', '#22c55e', '💰', (SELECT id FROM auth.users LIMIT 1)),
('Marketing', 'Processos de marketing e comunicação', '#f59e0b', '📈', (SELECT id FROM auth.users LIMIT 1)),
('Operações', 'Processos operacionais e logística', '#3b82f6', '⚙️', (SELECT id FROM auth.users LIMIT 1)),
('RH', 'Processos de recursos humanos', '#8b5cf6', '👥', (SELECT id FROM auth.users LIMIT 1)),
('Financeiro', 'Processos financeiros e contábeis', '#ef4444', '💳', (SELECT id FROM auth.users LIMIT 1)),
('TI', 'Processos de tecnologia da informação', '#06b6d4', '💻', (SELECT id FROM auth.users LIMIT 1));