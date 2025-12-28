-- Movimentações internas de produto (ajustes manuais, inventário, etc)
-- Objetivo: rastreabilidade total de alterações em estoque e preços com usuário/data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.produto_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- ajuste_estoque | ajuste_preco_venda | ajuste_preco_custo | inventario | inventario_aprovado | etc
  motivo TEXT NULL,

  quantidade_antes INTEGER NULL,
  quantidade_depois INTEGER NULL,
  quantidade_delta INTEGER NULL,

  valor_venda_antes NUMERIC NULL,
  valor_venda_depois NUMERIC NULL,

  valor_custo_antes NUMERIC NULL,
  valor_custo_depois NUMERIC NULL,

  inventario_id UUID NULL,

  user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  user_nome TEXT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produto_mov_produto_id_created_at
  ON public.produto_movimentacoes (produto_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_produto_mov_inventario_id
  ON public.produto_movimentacoes (inventario_id);


