-- Pagamentos de OS (adiantamento/pagamento final) rastreáveis e vinculados à venda
CREATE TABLE IF NOT EXISTS os_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  ordem_servico_id UUID NOT NULL,
  sale_id UUID NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  forma_pagamento VARCHAR(50) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID
);

CREATE INDEX IF NOT EXISTS idx_os_pagamentos_ordem_servico ON os_pagamentos(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_pagamentos_sale ON os_pagamentos(sale_id);
CREATE INDEX IF NOT EXISTS idx_os_pagamentos_company ON os_pagamentos(company_id);

COMMENT ON TABLE os_pagamentos IS 'Pagamentos/adiantamentos de OS vinculados a uma venda (documento rastreável)';
