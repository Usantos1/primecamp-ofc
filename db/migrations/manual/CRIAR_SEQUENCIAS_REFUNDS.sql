-- ═══════════════════════════════════════════════════════
-- CRIAR SEQUÊNCIAS E FUNÇÕES PARA DEVOLUÇÕES E VOUCHERS
-- ═══════════════════════════════════════════════════════

-- Sequência para número de devolução
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'refund_number_seq') THEN
    CREATE SEQUENCE refund_number_seq START WITH 1;
    RAISE NOTICE 'Sequência refund_number_seq criada';
  ELSE
    RAISE NOTICE 'Sequência refund_number_seq já existe';
  END IF;
END $$;

-- Função para gerar código de voucher único (código curto de 6 caracteres)
CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sem I, O, 0, 1 para evitar confusão
  result TEXT := 'VC';
  i INTEGER;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    result := 'VC';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM vouchers WHERE code = result) INTO code_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela refunds se não existir
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  sale_id UUID,
  refund_number VARCHAR(20) UNIQUE NOT NULL,
  refund_type VARCHAR(50) DEFAULT 'full', -- 'full', 'partial'
  reason TEXT,
  reason_details TEXT,
  total_refund_value DECIMAL(12,2) DEFAULT 0,
  refund_method VARCHAR(50) DEFAULT 'voucher', -- 'voucher', 'cash', 'card', 'pix'
  customer_id UUID,
  customer_name VARCHAR(255),
  notes TEXT,
  voucher_id UUID,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'cancelled'
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP,
  completed_by UUID,
  completed_at TIMESTAMP,
  cancelled_by UUID,
  cancelled_at TIMESTAMP,
  cancel_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela refund_items se não existir
CREATE TABLE IF NOT EXISTS refund_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID REFERENCES refunds(id) ON DELETE CASCADE,
  sale_item_id UUID,
  product_id UUID,
  product_name VARCHAR(255),
  quantity DECIMAL(10,3) DEFAULT 1,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  reason TEXT,
  condition VARCHAR(50) DEFAULT 'novo', -- 'novo', 'usado', 'defeituoso'
  return_to_stock BOOLEAN DEFAULT TRUE,
  destination VARCHAR(50) DEFAULT 'stock', -- 'stock', 'exchange', 'loss'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela vouchers se não existir
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  original_sale_id UUID,
  refund_id UUID REFERENCES refunds(id),
  customer_id UUID,
  customer_name VARCHAR(255),
  customer_document VARCHAR(20),
  customer_phone VARCHAR(20),
  original_value DECIMAL(12,2) NOT NULL,
  current_value DECIMAL(12,2) NOT NULL,
  is_transferable BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'used', 'expired', 'cancelled'
  expires_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela voucher_usage se não existir
CREATE TABLE IF NOT EXISTS voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES vouchers(id),
  sale_id UUID,
  company_id UUID,
  amount_used DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  used_by UUID,
  used_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar coluna destination em refund_items se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'refund_items' AND column_name = 'destination'
  ) THEN
    ALTER TABLE refund_items ADD COLUMN destination VARCHAR(50) DEFAULT 'stock';
    RAISE NOTICE 'Coluna destination adicionada em refund_items';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_refunds_company_id ON refunds(company_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refund_items_refund_id ON refund_items(refund_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_company_id ON vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- Verificar criação
SELECT 
  'refund_number_seq' as objeto,
  CASE WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'refund_number_seq') 
       THEN '✅ OK' ELSE '❌ FALTA' END as status
UNION ALL
SELECT 
  'generate_voucher_code()',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_voucher_code') 
       THEN '✅ OK' ELSE '❌ FALTA' END
UNION ALL
SELECT 'refunds', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refunds') THEN '✅ OK' ELSE '❌ FALTA' END
UNION ALL
SELECT 'refund_items', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refund_items') THEN '✅ OK' ELSE '❌ FALTA' END
UNION ALL
SELECT 'vouchers', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vouchers') THEN '✅ OK' ELSE '❌ FALTA' END
UNION ALL
SELECT 'voucher_usage', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voucher_usage') THEN '✅ OK' ELSE '❌ FALTA' END;

