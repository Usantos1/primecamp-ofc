-- ==========================================
-- ADICIONAR CAMPOS DA PLANILHA À TABELA PRODUTOS
-- ==========================================
-- Execute este script no Supabase SQL Editor
-- para adicionar os campos da planilha Excel

-- Adicionar campos se não existirem
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS codigo INTEGER,
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
  ADD COLUMN IF NOT EXISTS referencia TEXT,
  ADD COLUMN IF NOT EXISTS grupo TEXT,
  ADD COLUMN IF NOT EXISTS sub_grupo TEXT,
  ADD COLUMN IF NOT EXISTS vi_compra NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vi_custo NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_percentual NUMERIC(5,2) DEFAULT 0;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_grupo ON public.produtos(grupo) WHERE grupo IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.produtos.codigo IS 'Código interno do produto';
COMMENT ON COLUMN public.produtos.codigo_barras IS 'Código de barras do produto';
COMMENT ON COLUMN public.produtos.referencia IS 'Referência do produto';
COMMENT ON COLUMN public.produtos.grupo IS 'Grupo/Categoria do produto';
COMMENT ON COLUMN public.produtos.sub_grupo IS 'Subcategoria do produto';
COMMENT ON COLUMN public.produtos.vi_compra IS 'Valor de compra (VI Compra)';
COMMENT ON COLUMN public.produtos.vi_custo IS 'Valor de custo (VI Custo)';
COMMENT ON COLUMN public.produtos.quantidade IS 'Quantidade em estoque';
COMMENT ON COLUMN public.produtos.margem_percentual IS 'Margem de lucro em percentual';

-- Verificar se as colunas foram criadas
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'produtos'
  AND column_name IN ('codigo', 'codigo_barras', 'referencia', 'grupo', 'sub_grupo', 'vi_compra', 'vi_custo', 'quantidade', 'margem_percentual')
ORDER BY column_name;

