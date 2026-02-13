-- ============================================
-- SOLICITAÇÕES DE CANCELAMENTO DE VENDA
-- Use este script se o banco usa public.users (API Prime Camp).
-- Para Supabase, use APPLY_CANCEL_REQUESTS_MIGRATION.sql (auth.users).
-- ============================================

CREATE TABLE IF NOT EXISTS public.sale_cancel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,

  solicitante_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  solicitante_nome TEXT NOT NULL,
  solicitante_email TEXT,

  motivo TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  aprovado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
  aprovado_por_nome TEXT,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  motivo_rejeicao TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancel_requests_sale_id ON public.sale_cancel_requests(sale_id);
CREATE INDEX IF NOT EXISTS idx_cancel_requests_solicitante_id ON public.sale_cancel_requests(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_cancel_requests_status ON public.sale_cancel_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancel_requests_created_at ON public.sale_cancel_requests(created_at DESC);

-- Trigger updated_at (opcional; requer função update_updated_at_column)
-- DROP TRIGGER IF EXISTS update_cancel_requests_updated_at ON public.sale_cancel_requests;
-- CREATE TRIGGER update_cancel_requests_updated_at
--   BEFORE UPDATE ON public.sale_cancel_requests
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.sale_cancel_requests IS 'Solicitações de cancelamento de vendas (vendedor envia; admin aprova/rejeita)';
