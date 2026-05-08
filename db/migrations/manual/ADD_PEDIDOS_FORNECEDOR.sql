-- Vincula pedidos de compra ao cadastro de fornecedores usado na OS.

ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID NULL REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_fornecedor_id
  ON public.pedidos (fornecedor_id);
