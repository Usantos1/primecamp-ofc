-- =====================================================
-- CORREÇÃO DA TABELA PAYMENT_METHODS E CRIAÇÃO DAS DEMAIS
-- =====================================================

-- Verificar estrutura atual da tabela payment_methods
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'payment_methods' ORDER BY ordinal_position;

-- Adicionar colunas faltantes na tabela payment_methods existente
DO $$ BEGIN
    -- Adicionar company_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'company_id') THEN
        ALTER TABLE payment_methods ADD COLUMN company_id UUID REFERENCES companies(id);
        RAISE NOTICE 'Coluna company_id adicionada em payment_methods';
    END IF;
    
    -- Adicionar name se não existir (ou renomear nome)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'nome') THEN
            ALTER TABLE payment_methods RENAME COLUMN nome TO name;
            RAISE NOTICE 'Coluna nome renomeada para name';
        ELSE
            ALTER TABLE payment_methods ADD COLUMN name VARCHAR(100);
            RAISE NOTICE 'Coluna name adicionada';
        END IF;
    END IF;
    
    -- Adicionar code se não existir (ou renomear codigo)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'code') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'codigo') THEN
            ALTER TABLE payment_methods RENAME COLUMN codigo TO code;
            RAISE NOTICE 'Coluna codigo renomeada para code';
        ELSE
            ALTER TABLE payment_methods ADD COLUMN code VARCHAR(50);
            RAISE NOTICE 'Coluna code adicionada';
        END IF;
    END IF;
    
    -- Adicionar description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'description') THEN
        ALTER TABLE payment_methods ADD COLUMN description TEXT;
        RAISE NOTICE 'Coluna description adicionada';
    END IF;
    
    -- Adicionar is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'is_active') THEN
        ALTER TABLE payment_methods ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Coluna is_active adicionada';
    END IF;
    
    -- Adicionar accepts_installments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'accepts_installments') THEN
        ALTER TABLE payment_methods ADD COLUMN accepts_installments BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna accepts_installments adicionada';
    END IF;
    
    -- Adicionar max_installments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'max_installments') THEN
        ALTER TABLE payment_methods ADD COLUMN max_installments INTEGER DEFAULT 1;
        RAISE NOTICE 'Coluna max_installments adicionada';
    END IF;
    
    -- Adicionar min_value_for_installments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'min_value_for_installments') THEN
        ALTER TABLE payment_methods ADD COLUMN min_value_for_installments DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Coluna min_value_for_installments adicionada';
    END IF;
    
    -- Adicionar icon
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'icon') THEN
        ALTER TABLE payment_methods ADD COLUMN icon VARCHAR(50);
        RAISE NOTICE 'Coluna icon adicionada';
    END IF;
    
    -- Adicionar color
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'color') THEN
        ALTER TABLE payment_methods ADD COLUMN color VARCHAR(20);
        RAISE NOTICE 'Coluna color adicionada';
    END IF;
    
    -- Adicionar sort_order
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'sort_order') THEN
        ALTER TABLE payment_methods ADD COLUMN sort_order INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna sort_order adicionada';
    END IF;
    
    -- Adicionar created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'created_at') THEN
        ALTER TABLE payment_methods ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Coluna created_at adicionada';
    END IF;
    
    -- Adicionar updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'updated_at') THEN
        ALTER TABLE payment_methods ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at adicionada';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- TABELA DE TAXAS POR FORMA DE PAGAMENTO
-- ═══════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════
-- TABELA DE VALES COMPRA
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    code VARCHAR(20) NOT NULL UNIQUE,
    original_sale_id UUID,
    refund_id UUID,
    customer_id UUID REFERENCES clientes(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_document VARCHAR(20),
    customer_phone VARCHAR(20),
    original_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    is_transferable BOOLEAN DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- TABELA DE USO DOS VALES COMPRA
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS voucher_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id),
    sale_id UUID,
    amount_used DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- TABELA DE DEVOLUÇÕES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    sale_id UUID,
    refund_number VARCHAR(20) NOT NULL,
    refund_type VARCHAR(20) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    reason_details TEXT,
    total_refund_value DECIMAL(10,2) NOT NULL,
    refund_method VARCHAR(20) NOT NULL,
    voucher_id UUID,
    status VARCHAR(20) DEFAULT 'pending',
    customer_id UUID REFERENCES clientes(id),
    customer_name VARCHAR(255),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- TABELA DE ITENS DA DEVOLUÇÃO
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS refund_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    sale_item_id UUID,
    product_id UUID REFERENCES produtos(id),
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    reason VARCHAR(100),
    condition VARCHAR(50),
    return_to_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- TABELA DE ESTORNOS DE PAGAMENTO
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    refund_id UUID NOT NULL REFERENCES refunds(id),
    original_payment_id UUID,
    payment_method VARCHAR(50) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    external_refund_id VARCHAR(100),
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_payment_methods_company ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_fees_method ON payment_fees(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_company ON vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_customer ON vouchers(customer_document);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher ON voucher_usage(voucher_id);
CREATE INDEX IF NOT EXISTS idx_refunds_company ON refunds(company_id);
CREATE INDEX IF NOT EXISTS idx_refunds_sale ON refunds(sale_id);
CREATE INDEX IF NOT EXISTS idx_refund_items_refund ON refund_items(refund_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_refund ON payment_refunds(refund_id);

-- ═══════════════════════════════════════════════════════
-- SEQUÊNCIA PARA NÚMERO DA DEVOLUÇÃO
-- ═══════════════════════════════════════════════════════
CREATE SEQUENCE IF NOT EXISTS refund_number_seq START 1;

-- ═══════════════════════════════════════════════════════
-- FUNÇÃO PARA GERAR CÓDIGO ÚNICO DO VALE COMPRA
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_code VARCHAR(20);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'VC' || TO_CHAR(NOW(), 'YYMM') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM vouchers WHERE code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════
SELECT 'Estrutura payment_methods:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'payment_methods' ORDER BY ordinal_position;

SELECT 'Tabelas criadas:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('payment_methods', 'payment_fees', 'vouchers', 'voucher_usage', 'refunds', 'refund_items', 'payment_refunds');

