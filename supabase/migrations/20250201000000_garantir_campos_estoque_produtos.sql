-- ==========================================
-- GARANTIR CAMPOS DE ESTOQUE E LOCALIZAÇÃO NA TABELA PRODUTOS
-- Migration para garantir que estoque_minimo e localizacao existam
-- ==========================================

-- Verificar e adicionar estoque_minimo se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'produtos' 
    AND column_name = 'estoque_minimo'
  ) THEN
    ALTER TABLE public.produtos
      ADD COLUMN estoque_minimo INTEGER NOT NULL DEFAULT 0;
    
    COMMENT ON COLUMN public.produtos.estoque_minimo IS 'Estoque mínimo para alerta de reposição (default 0)';
  ELSE
    -- Se já existe, garantir que tem default e pode ser NULL
    ALTER TABLE public.produtos
      ALTER COLUMN estoque_minimo SET DEFAULT 0,
      ALTER COLUMN estoque_minimo DROP NOT NULL;
    
    -- Atualizar valores NULL para 0
    UPDATE public.produtos
    SET estoque_minimo = 0
    WHERE estoque_minimo IS NULL;
  END IF;
END $$;

-- Verificar e adicionar localizacao se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'produtos' 
    AND column_name = 'localizacao'
  ) THEN
    ALTER TABLE public.produtos
      ADD COLUMN localizacao TEXT;
    
    COMMENT ON COLUMN public.produtos.localizacao IS 'Localização física do produto no estoque (ex: Prateleira A3, Gaveta 2)';
  END IF;
END $$;

-- Criar índice para localizacao se não existir (para buscas)
CREATE INDEX IF NOT EXISTS idx_produtos_localizacao ON public.produtos(localizacao) WHERE localizacao IS NOT NULL;

-- Criar índice para estoque_minimo se não existir (para alertas)
CREATE INDEX IF NOT EXISTS idx_produtos_estoque_minimo ON public.produtos(estoque_minimo) WHERE estoque_minimo > 0;

-- ==========================================
-- VERIFICAR E GARANTIR ESTRUTURA DE MOVIMENTAÇÕES DE ESTOQUE
-- As movimentações já estão na tabela os_items, mas vamos garantir
-- que a relação com produtos está correta
-- ==========================================

-- Verificar se a foreign key produto_id existe em os_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'os_items' 
    AND constraint_name LIKE '%produto%'
  ) THEN
    -- Adicionar foreign key se não existir
    ALTER TABLE public.os_items
      ADD CONSTRAINT fk_os_items_produto_id 
      FOREIGN KEY (produto_id) 
      REFERENCES public.produtos(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Garantir que o índice em produto_id existe para performance
CREATE INDEX IF NOT EXISTS idx_os_items_produto_id ON public.os_items(produto_id) WHERE produto_id IS NOT NULL;

-- Criar índice composto para buscas de movimentações por produto e data
CREATE INDEX IF NOT EXISTS idx_os_items_produto_data ON public.os_items(produto_id, created_at DESC) 
WHERE produto_id IS NOT NULL AND tipo = 'peca';

-- Comentários para documentação
COMMENT ON COLUMN public.os_items.produto_id IS 'Referência ao produto utilizado na OS (para rastreamento de estoque)';
COMMENT ON COLUMN public.os_items.quantidade IS 'Quantidade do produto/peça utilizada (baixa de estoque)';
COMMENT ON COLUMN public.os_items.tipo IS 'Tipo do item: peca (baixa estoque), servico ou mao_de_obra';

