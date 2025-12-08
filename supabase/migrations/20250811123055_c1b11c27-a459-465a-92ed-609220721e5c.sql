-- Criar tabela para testes DISC
CREATE TABLE public.disc_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Teste DISC',
  description TEXT DEFAULT 'Avaliação de perfil comportamental DISC',
  total_questions INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para respostas dos testes DISC
CREATE TABLE public.disc_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_id UUID NOT NULL REFERENCES public.disc_tests(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  d_score INTEGER DEFAULT 0,
  i_score INTEGER DEFAULT 0,
  s_score INTEGER DEFAULT 0,
  c_score INTEGER DEFAULT 0,
  dominant_profile TEXT,
  completion_date TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.disc_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para disc_tests
CREATE POLICY "Users can view their own tests or admins can view all" 
ON public.disc_tests 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Only admins can create tests" 
ON public.disc_tests 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Only admins can update tests" 
ON public.disc_tests 
FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Only admins can delete tests" 
ON public.disc_tests 
FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Políticas para disc_responses
CREATE POLICY "Users can view their own responses or admins can view all" 
ON public.disc_responses 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create their own responses" 
ON public.disc_responses 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own incomplete responses" 
ON public.disc_responses 
FOR UPDATE 
USING (user_id = auth.uid() AND is_completed = false);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_disc_tests_updated_at
BEFORE UPDATE ON public.disc_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disc_responses_updated_at
BEFORE UPDATE ON public.disc_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir um teste padrão
INSERT INTO public.disc_tests (user_id, title, description, created_by) 
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Teste DISC - PrimeCamp',
  'Descubra seu perfil comportamental através de 20 perguntas objetivas',
  (SELECT id FROM auth.users LIMIT 1)
);