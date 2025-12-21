-- ==========================================
-- SIMPLIFICAR TABELA PRODUTOS
-- Adicionar campos necessários e remover campos fiscais/tributários
-- ==========================================

-- SEÇÃO: Identificação
-- codigo (int) -> obrigatório (pode ser gerado manualmente)
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS codigo INTEGER,
  ADD COLUMN IF NOT EXISTS nome_abreviado TEXT,
  ADD COLUMN IF NOT EXISTS sub_grupo TEXT;

-- SEÇÃO: Preço (BRL)
-- valor_compra (numeric(12,2)) -> custo/compra (R$)
-- valor_venda (numeric(12,2)) -> venda à vista (R$)
-- valor_parcelado_6x (numeric(12,2)) -> opcional (R$)
-- margem_percentual (numeric(6,2)) -> opcional (%)
-- permitir_desconto_percentual (numeric(6,2)) -> opcional (%). Default 0
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS valor_compra NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_venda NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_parcelado_6x NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS permitir_desconto_percentual NUMERIC(6,2) DEFAULT 0;

-- Ajustar margem_percentual se já existir (garantir tipo correto)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'produtos' 
    AND column_name = 'margem_percentual'
  ) THEN
    -- Se já existe, garantir que seja numeric(6,2)
    ALTER TABLE public.produtos
      ALTER COLUMN margem_percentual TYPE NUMERIC(6,2) USING margem_percentual::NUMERIC(6,2);
  ELSE
    -- Se não existe, criar
    ALTER TABLE public.produtos
      ADD COLUMN margem_percentual NUMERIC(6,2) DEFAULT 0;
  END IF;
END $$;

-- SEÇÃO: Estoque
-- quantidade (int) -> obrigatório (default 0)
-- estoque_minimo (int) -> opcional (default 0)
-- localizacao (text) -> opcional
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS localizacao TEXT;

-- Garantir que quantidade existe e tem default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'produtos' 
    AND column_name = 'quantidade'
  ) THEN
    -- Se já existe, garantir default
    ALTER TABLE public.produtos
      ALTER COLUMN quantidade SET DEFAULT 0;
  ELSE
    -- Se não existe, criar
    ALTER TABLE public.produtos
      ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- SEÇÃO: Configurações simples
-- situacao (text) -> default 'ATIVO' (ATIVO/INATIVO)
-- tipo (text) -> default 'PECA' (PECA/SERVICO/PRODUTO)
-- garantia_dias (int) -> opcional (default 90)
-- peso_kg (numeric(10,2)) -> opcional
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS situacao TEXT DEFAULT 'ATIVO' CHECK (situacao IN ('ATIVO', 'INATIVO')),
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'PECA' CHECK (tipo IN ('PECA', 'SERVICO', 'PRODUTO')),
  ADD COLUMN IF NOT EXISTS garantia_dias INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(10,2);

-- Garantir defaults nas colunas existentes
ALTER TABLE public.produtos
  ALTER COLUMN situacao SET DEFAULT 'ATIVO',
  ALTER COLUMN tipo SET DEFAULT 'PECA',
  ALTER COLUMN garantia_dias SET DEFAULT 90,
  ALTER COLUMN permitir_desconto_percentual SET DEFAULT 0,
  ALTER COLUMN estoque_minimo SET DEFAULT 0;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_situacao ON public.produtos(situacao);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON public.produtos(tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_grupo ON public.produtos(grupo) WHERE grupo IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.produtos.codigo IS 'Código interno do produto (obrigatório)';
COMMENT ON COLUMN public.produtos.nome_abreviado IS 'Nome abreviado do produto';
COMMENT ON COLUMN public.produtos.sub_grupo IS 'Subcategoria do produto';
COMMENT ON COLUMN public.produtos.valor_compra IS 'Valor de compra/custo (R$)';
COMMENT ON COLUMN public.produtos.valor_venda IS 'Valor de venda à vista (R$)';
COMMENT ON COLUMN public.produtos.valor_parcelado_6x IS 'Valor parcelado em 6x (R$)';
COMMENT ON COLUMN public.produtos.margem_percentual IS 'Margem de lucro em percentual (%)';
COMMENT ON COLUMN public.produtos.permitir_desconto_percentual IS 'Percentual máximo de desconto permitido (%)';
COMMENT ON COLUMN public.produtos.quantidade IS 'Quantidade em estoque (obrigatório, default 0)';
COMMENT ON COLUMN public.produtos.estoque_minimo IS 'Estoque mínimo (default 0)';
COMMENT ON COLUMN public.produtos.localizacao IS 'Localização física do produto';
COMMENT ON COLUMN public.produtos.situacao IS 'Situação do produto: ATIVO ou INATIVO (default ATIVO)';
COMMENT ON COLUMN public.produtos.tipo IS 'Tipo do produto: PECA, SERVICO ou PRODUTO (default PECA)';
COMMENT ON COLUMN public.produtos.garantia_dias IS 'Garantia em dias (default 90)';
COMMENT ON COLUMN public.produtos.peso_kg IS 'Peso do produto em quilogramas';

