-- =====================================================
-- Movimentações da tesouraria (carteira da empresa)
-- Transferências entre formas, pagamento de contas, retirada como lucro
-- =====================================================

CREATE TABLE IF NOT EXISTS treasury_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('transferencia', 'pagamento_conta', 'retirada_lucro', 'sangria')),
  forma_origem TEXT NOT NULL,
  forma_destino TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  motivo TEXT,
  bill_id UUID,
  operador_id UUID,
  operador_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treasury_movements_created_at ON treasury_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_movements_tipo ON treasury_movements(tipo);
CREATE INDEX IF NOT EXISTS idx_treasury_movements_bill_id ON treasury_movements(bill_id);

COMMENT ON TABLE treasury_movements IS 'Movimentações da tesouraria: transferência entre carteiras, pagamento de conta a pagar, retirada como lucro';
