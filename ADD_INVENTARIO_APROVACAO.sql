-- Inventário com aprovação (contagem -> aprovação admin -> ajuste de estoque)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.inventarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  filtros JSONB NULL,
  total_itens INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_nome TEXT NULL,

  approved_at TIMESTAMP WITH TIME ZONE NULL,
  approved_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by_nome TEXT NULL,

  rejected_at TIMESTAMP WITH TIME ZONE NULL,
  rejected_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_by_nome TEXT NULL,
  rejected_reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventarios_status_created_at
  ON public.inventarios (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.inventario_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id UUID NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_nome TEXT NULL,
  qtd_sistema INTEGER NOT NULL DEFAULT 0,
  qtd_contada INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventario_itens_inventario_id
  ON public.inventario_itens (inventario_id);

CREATE INDEX IF NOT EXISTS idx_inventario_itens_produto_id
  ON public.inventario_itens (produto_id);


