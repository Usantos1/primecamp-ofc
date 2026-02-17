-- ============================================
-- CRIAR TABELA os_pagamentos (pagamentos de OS como vendas rastreáveis)
-- Execute no Supabase SQL Editor se o registro de pagamento da OS falhar
-- ============================================

CREATE TABLE IF NOT EXISTS public.os_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL,
  forma_pagamento TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('adiantamento', 'pagamento_final')),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID,
  company_id UUID
);

CREATE INDEX IF NOT EXISTS idx_os_pagamentos_ordem_servico_id ON public.os_pagamentos(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_pagamentos_sale_id ON public.os_pagamentos(sale_id);
CREATE INDEX IF NOT EXISTS idx_os_pagamentos_created_at ON public.os_pagamentos(created_at);

ALTER TABLE public.os_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ver os_pagamentos" ON public.os_pagamentos;
CREATE POLICY "Usuários autenticados podem ver os_pagamentos"
  ON public.os_pagamentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir os_pagamentos" ON public.os_pagamentos;
CREATE POLICY "Usuários autenticados podem inserir os_pagamentos"
  ON public.os_pagamentos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar os_pagamentos" ON public.os_pagamentos;
CREATE POLICY "Usuários autenticados podem atualizar os_pagamentos"
  ON public.os_pagamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
