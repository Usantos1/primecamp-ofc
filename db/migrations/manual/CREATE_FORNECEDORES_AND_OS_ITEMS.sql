-- ============================================
-- Tabela de fornecedores (peças) + vínculo em os_items
-- Execute no PostgreSQL UMA VEZ. Controle interno (não sai no cupom).
-- ============================================

-- 1) Criar tabela fornecedores (por empresa; company_id = mesmo de users)
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_company_id ON public.fornecedores(company_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON public.fornecedores(nome);

-- 2) Adicionar coluna fornecedor_id em os_items (opcional)
ALTER TABLE public.os_items
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id);

-- Manter fornecedor_nome para compatibilidade (pode preencher a partir do fornecedor selecionado)
COMMENT ON COLUMN public.os_items.fornecedor_id IS 'Fornecedor da peça (controle interno, garantia). Opcional.';
COMMENT ON COLUMN public.os_items.fornecedor_nome IS 'Nome do fornecedor (legado ou quando não há cadastro).';
