-- ============================================
-- Tabela de fornecedores de peças (controle interno por empresa)
-- e vínculo opcional em os_items para garantia/retorno.
-- Execute no PostgreSQL UMA VEZ (psql ou cliente).
-- ============================================

-- 1) Criar tabela fornecedores (por empresa)
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_company_id ON public.fornecedores(company_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON public.fornecedores(nome);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome_lower ON public.fornecedores(LOWER(nome));

COMMENT ON TABLE public.fornecedores IS 'Fornecedores de peças (controle interno). Usado em os_items para rastrear origem em caso de garantia.';

-- 2) Adicionar coluna opcional fornecedor_id em os_items (mantém fornecedor_nome para compatibilidade)
ALTER TABLE public.os_items
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_os_items_fornecedor_id ON public.os_items(fornecedor_id);

COMMENT ON COLUMN public.os_items.fornecedor_id IS 'Fornecedor da peça (opcional). Controle interno; não sai no cupom de faturamento.';
