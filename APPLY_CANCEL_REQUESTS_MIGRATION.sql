-- ============================================
-- SOLICITAÇÕES DE CANCELAMENTO DE VENDA
-- ============================================

-- Tabela para solicitações de cancelamento
CREATE TABLE IF NOT EXISTS public.sale_cancel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  
  -- Solicitante
  solicitante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  solicitante_nome TEXT NOT NULL,
  solicitante_email TEXT,
  
  -- Motivo
  motivo TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Aprovação/Rejeição
  aprovado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_por_nome TEXT,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  motivo_rejeicao TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cancel_requests_sale_id ON public.sale_cancel_requests(sale_id);
CREATE INDEX IF NOT EXISTS idx_cancel_requests_solicitante_id ON public.sale_cancel_requests(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_cancel_requests_status ON public.sale_cancel_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancel_requests_created_at ON public.sale_cancel_requests(created_at DESC);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_cancel_requests_updated_at ON public.sale_cancel_requests;
CREATE TRIGGER update_cancel_requests_updated_at
  BEFORE UPDATE ON public.sale_cancel_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.sale_cancel_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cancel_requests" ON public.sale_cancel_requests 
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert cancel_requests" ON public.sale_cancel_requests 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update cancel_requests" ON public.sale_cancel_requests 
  FOR UPDATE USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.sale_cancel_requests IS 'Solicitações de cancelamento de vendas (para usuários sem permissão direta)';

