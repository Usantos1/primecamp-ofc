-- =============================================
-- Tabelas de Pedidos (pedidos de compra / entrada de estoque)
-- Executar no pgAdmin (ou: psql -U postgres -d SEU_BANCO -f sql/CRIAR_TABELAS_PEDIDOS.sql)
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cabeçalho do pedido
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  created_by_nome TEXT NULL,

  recebido BOOLEAN NOT NULL DEFAULT FALSE,
  received_at TIMESTAMP WITH TIME ZONE NULL,
  received_by UUID NULL,
  received_by_nome TEXT NULL
);

COMMENT ON TABLE public.pedidos IS 'Pedidos de compra para entrada de estoque';
COMMENT ON COLUMN public.pedidos.nome IS 'Nome/identificação do pedido';
COMMENT ON COLUMN public.pedidos.recebido IS 'True quando já foi dada entrada no estoque';

CREATE INDEX IF NOT EXISTS idx_pedidos_created_at
  ON public.pedidos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_recebido
  ON public.pedidos (recebido);

-- Itens do pedido
CREATE TABLE IF NOT EXISTS public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,

  produto_id UUID NOT NULL,
  produto_nome TEXT NULL,
  codigo INTEGER NULL,
  referencia TEXT NULL,

  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_compra NUMERIC(12, 4) NULL,
  valor_venda NUMERIC(12, 4) NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pedido_itens IS 'Itens de cada pedido (produto, qtd, custo e venda por unidade)';

CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido_id
  ON public.pedido_itens (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_produto_id
  ON public.pedido_itens (produto_id);

-- Opcional: FK para produtos (descomente se a tabela produtos existir no mesmo schema)
-- ALTER TABLE public.pedido_itens
--   ADD CONSTRAINT fk_pedido_itens_produto
--   FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;
