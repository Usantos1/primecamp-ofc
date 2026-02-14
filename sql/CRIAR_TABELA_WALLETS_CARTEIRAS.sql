-- =====================================================
-- Carteiras/Contas (para qual banco ou carteira cada forma de pagamento)
-- Ex.: Carteira física em dinheiro, C6 Bank, Sumup Bank
-- =====================================================

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_company ON wallets(company_id);
CREATE INDEX IF NOT EXISTS idx_wallets_sort ON wallets(sort_order);

-- Coluna em payment_methods: qual carteira/conta está vinculada a esta forma
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'wallet_id') THEN
    ALTER TABLE payment_methods ADD COLUMN wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_payment_methods_wallet ON payment_methods(wallet_id);
  END IF;
END $$;

-- Carteiras padrão (podem ser compartilhadas entre companies se company_id for NULL)
INSERT INTO wallets (id, name, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Carteira física em dinheiro', 0),
  ('a0000000-0000-0000-0000-000000000002', 'Carteira digital C6 Bank', 1),
  ('a0000000-0000-0000-0000-000000000003', 'Carteira Sumup Bank', 2)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE wallets IS 'Carteiras/contas (banco ou físico) às quais as formas de pagamento podem ser vinculadas';
