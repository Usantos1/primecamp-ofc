-- ============================================
-- Tabela de períodos de garantia + colunas em produtos (tipo, unidade, garantia_dias)
-- Execute no PostgreSQL que a API usa (VPS / api.primecamp.cloud) UMA VEZ.
-- Não é Supabase: o app usa PostgreSQL via API REST.
-- ============================================

-- 1) Tabela de garantias (lookup: Nenhum, 7 dias, 30 dias, 90 dias, 180 dias, 1 ano)
CREATE TABLE IF NOT EXISTS public.garantias (
  id SMALLINT PRIMARY KEY,
  dias INTEGER NOT NULL,
  label TEXT NOT NULL,
  ordem SMALLINT NOT NULL DEFAULT 0
);

-- Inserir opções (idempotente: só insere se não existir)
INSERT INTO public.garantias (id, dias, label, ordem)
VALUES
  (1, 0,   'Nenhum',    1),
  (2, 7,   '7 dias',    2),
  (3, 30,  '30 dias',   3),
  (4, 90,  '90 dias',   4),
  (5, 180, '180 dias',  5),
  (6, 365, '1 ano',     6)
ON CONFLICT (id) DO UPDATE SET
  dias = EXCLUDED.dias,
  label = EXCLUDED.label,
  ordem = EXCLUDED.ordem;

-- 2) Colunas em produtos (garantia_dias, tipo, unidade) — se ainda não existirem
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS garantia_dias INTEGER;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS tipo TEXT;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'UN';

COMMENT ON COLUMN public.produtos.garantia_dias IS 'Período de garantia em dias. NULL ou 0 = nenhum. Valores sugeridos: 0, 7, 30, 90, 180, 365 (ver tabela garantias).';
COMMENT ON COLUMN public.produtos.tipo IS 'Tipo: PECA, PRODUTO ou SERVICO.';
COMMENT ON COLUMN public.produtos.unidade IS 'Unidade de venda/estoque: UN, CX, KT, PCS, etc.';
