-- =====================================================
-- CRIAR TABELA payment_fees (taxas por forma de pagamento)
-- Execute este script no banco da API (ex.: api.primecamp.cloud)
-- para corrigir o erro: relation "payment_fees" does not exist
-- =====================================================

-- Tabela de taxas por forma de pagamento e parcelas
CREATE TABLE IF NOT EXISTS payment_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    installments INTEGER NOT NULL DEFAULT 1,
    fee_percentage DECIMAL(5,2) DEFAULT 0,
    fee_fixed DECIMAL(10,2) DEFAULT 0,
    days_to_receive INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_fees_method ON payment_fees(payment_method_id);

-- Garantir que payment_methods tenha as colunas necessárias (sem renomear nome/codigo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'description') THEN
    ALTER TABLE payment_methods ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'is_active') THEN
    ALTER TABLE payment_methods ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'accepts_installments') THEN
    ALTER TABLE payment_methods ADD COLUMN accepts_installments BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'max_installments') THEN
    ALTER TABLE payment_methods ADD COLUMN max_installments INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'min_value_for_installments') THEN
    ALTER TABLE payment_methods ADD COLUMN min_value_for_installments DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'icon') THEN
    ALTER TABLE payment_methods ADD COLUMN icon VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'color') THEN
    ALTER TABLE payment_methods ADD COLUMN color VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'sort_order') THEN
    ALTER TABLE payment_methods ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Opcional: inserir Fiado e Carteira Digital por company (requer tabela companies)
-- Suporta payment_methods com "name"/"code" (novo) ou "nome"/"codigo" (antigo).
DO $$
DECLARE
  name_col TEXT;
  code_col TEXT;
BEGIN
  SELECT COALESCE(
    (SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'name' LIMIT 1),
    'nome'
  ) INTO name_col;
  SELECT COALESCE(
    (SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'code' LIMIT 1),
    'codigo'
  ) INTO code_col;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    EXECUTE format(
      'INSERT INTO payment_methods (company_id, %I, %I, description, is_active, accepts_installments, max_installments, min_value_for_installments, icon, color, sort_order) ' ||
      'SELECT c.id, $1, $2, $3, true, false, 1, 0, $4, $5, 100 FROM companies c ' ||
      'WHERE NOT EXISTS (SELECT 1 FROM payment_methods pm WHERE pm.company_id = c.id AND pm.' || code_col || ' = $2)',
      name_col, code_col
    ) USING 'Fiado', 'fiado', 'Venda a prazo / fiado', 'Ticket', '#6b7280';
    EXECUTE format(
      'INSERT INTO payment_methods (company_id, %I, %I, description, is_active, accepts_installments, max_installments, min_value_for_installments, icon, color, sort_order) ' ||
      'SELECT c.id, $1, $2, $3, true, false, 1, 0, $4, $5, 101 FROM companies c ' ||
      'WHERE NOT EXISTS (SELECT 1 FROM payment_methods pm WHERE pm.company_id = c.id AND pm.' || code_col || ' = $2)',
      name_col, code_col
    ) USING 'Carteira Digital', 'carteira_digital', 'Carteira digital / app', 'CreditCard', '#8b5cf6';
  END IF;
END $$;
