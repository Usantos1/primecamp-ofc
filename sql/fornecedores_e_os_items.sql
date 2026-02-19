-- ============================================
-- Tabela de fornecedores (peças) + vínculo em os_items
-- Execute no PostgreSQL UMA VEZ (psql ou cliente).
-- Usado no modal de itens da OS para controle interno (garantia/retorno).
-- ============================================

-- 1) Criar tabela fornecedores (por empresa)
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_company_id ON public.fornecedores(company_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON public.fornecedores(nome);

COMMENT ON TABLE public.fornecedores IS 'Fornecedores de peças (controle interno na OS; não sai no cupom)';

-- 2) Adicionar coluna fornecedor_id em os_items (opcional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'os_items' AND column_name = 'fornecedor_id'
  ) THEN
    ALTER TABLE public.os_items
      ADD COLUMN fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL;
    CREATE INDEX idx_os_items_fornecedor_id ON public.os_items(fornecedor_id);
  END IF;
END $$;

-- Manter fornecedor_nome em os_items para exibição (pode ser preenchido pelo app a partir do fornecedor selecionado).
