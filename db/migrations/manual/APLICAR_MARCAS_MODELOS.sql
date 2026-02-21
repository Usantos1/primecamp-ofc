-- Aplicar migration de marcas e modelos
-- Execute este script no Supabase SQL Editor

-- Criar tabela de marcas
CREATE TABLE IF NOT EXISTS public.marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar índice único para nome (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_marcas_nome_unique ON public.marcas(LOWER(nome));

-- Criar tabela de modelos
CREATE TABLE IF NOT EXISTS public.modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar índice único para nome e marca_id (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_modelos_marca_nome_unique ON public.modelos(marca_id, LOWER(nome));

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_modelos_marca_id ON public.modelos(marca_id);
CREATE INDEX IF NOT EXISTS idx_modelos_situacao ON public.modelos(situacao);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_marcas_modelos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para updated_at
DROP TRIGGER IF EXISTS tg_set_updated_at_marcas ON public.marcas;
CREATE TRIGGER tg_set_updated_at_marcas
  BEFORE UPDATE ON public.marcas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_marcas_modelos();

DROP TRIGGER IF EXISTS tg_set_updated_at_modelos ON public.modelos;
CREATE TRIGGER tg_set_updated_at_modelos
  BEFORE UPDATE ON public.modelos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_marcas_modelos();

-- Habilitar RLS
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para marcas
DROP POLICY IF EXISTS "Anyone can view marcas" ON public.marcas;
CREATE POLICY "Anyone can view marcas"
  ON public.marcas FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert marcas" ON public.marcas;
CREATE POLICY "Authenticated users can insert marcas"
  ON public.marcas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update marcas" ON public.marcas;
CREATE POLICY "Authenticated users can update marcas"
  ON public.marcas FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete marcas" ON public.marcas;
CREATE POLICY "Authenticated users can delete marcas"
  ON public.marcas FOR DELETE
  USING (auth.role() = 'authenticated');

-- Políticas RLS para modelos
DROP POLICY IF EXISTS "Anyone can view modelos" ON public.modelos;
CREATE POLICY "Anyone can view modelos"
  ON public.modelos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert modelos" ON public.modelos;
CREATE POLICY "Authenticated users can insert modelos"
  ON public.modelos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update modelos" ON public.modelos;
CREATE POLICY "Authenticated users can update modelos"
  ON public.modelos FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete modelos" ON public.modelos;
CREATE POLICY "Authenticated users can delete modelos"
  ON public.modelos FOR DELETE
  USING (auth.role() = 'authenticated');

-- Comentários
COMMENT ON TABLE public.marcas IS 'Tabela de marcas de celulares e dispositivos';
COMMENT ON TABLE public.modelos IS 'Tabela de modelos de celulares e dispositivos, vinculados a marcas';

