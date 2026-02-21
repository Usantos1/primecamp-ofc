-- =====================================================
-- SISTEMA DE DEVOLUÇÃO, VALE COMPRA E GESTÃO DE PAGAMENTOS
-- =====================================================

-- ═══════════════════════════════════════════════════════
-- TABELA DE FORMAS DE PAGAMENTO
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL, -- dinheiro, pix, credito, debito, vale_compra, etc
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    accepts_installments BOOLEAN DEFAULT false,
    max_installments INTEGER DEFAULT 1,
    min_value_for_installments DECIMAL(10,2) DEFAULT 0,
    icon VARCHAR(50), -- nome do ícone para exibir no frontend
    color VARCHAR(20), -- cor para identificação visual
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- ═══════════════════════════════════════════════════════
-- TABELA DE TAXAS POR FORMA DE PAGAMENTO
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    installments INTEGER NOT NULL DEFAULT 1, -- número de parcelas (1 = à vista)
    fee_percentage DECIMAL(5,2) DEFAULT 0, -- taxa percentual
    fee_fixed DECIMAL(10,2) DEFAULT 0, -- taxa fixa
    days_to_receive INTEGER DEFAULT 0, -- dias para receber o valor
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payment_method_id, installments)
);

-- ═══════════════════════════════════════════════════════
-- TABELA DE VALES COMPRA
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    code VARCHAR(20) NOT NULL UNIQUE, -- código único do vale
    original_sale_id UUID REFERENCES vendas(id), -- venda que originou o vale (se devolução)
    refund_id UUID, -- ID da devolução que gerou o vale
    customer_id UUID REFERENCES clientes(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_document VARCHAR(20), -- CPF/CNPJ para vincular ao cliente
    customer_phone VARCHAR(20),
    original_value DECIMAL(10,2) NOT NULL, -- valor original do vale
    current_value DECIMAL(10,2) NOT NULL, -- valor atual disponível
    expires_at TIMESTAMP WITH TIME ZONE, -- data de expiração (null = não expira)
    status VARCHAR(20) DEFAULT 'active', -- active, used, expired, cancelled
    is_transferable BOOLEAN DEFAULT false, -- se pode ser transferido
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
    sale_id UUID REFERENCES vendas(id),
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
    company_id UUID NOT NULL REFERENCES companies(id),
    sale_id UUID NOT NULL REFERENCES vendas(id),
    refund_number VARCHAR(20) NOT NULL, -- número sequencial da devolução
    refund_type VARCHAR(20) NOT NULL, -- full (total), partial (parcial)
    reason VARCHAR(100) NOT NULL, -- motivo da devolução
    reason_details TEXT,
    total_refund_value DECIMAL(10,2) NOT NULL,
    refund_method VARCHAR(20) NOT NULL, -- cash (dinheiro), voucher (vale compra), original (estorno original)
    voucher_id UUID REFERENCES vouchers(id), -- se gerou vale compra
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, completed, cancelled
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
    sale_item_id UUID, -- referência ao item da venda original
    product_id UUID REFERENCES produtos(id),
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    reason VARCHAR(100), -- motivo específico do item
    condition VARCHAR(50), -- novo, usado, defeituoso
    return_to_stock BOOLEAN DEFAULT true, -- se retorna ao estoque
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- TABELA DE ESTORNOS DE PAGAMENTO
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    refund_id UUID NOT NULL REFERENCES refunds(id),
    original_payment_id UUID REFERENCES payments(id),
    payment_method VARCHAR(50) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    external_refund_id VARCHAR(100), -- ID do estorno no gateway (se aplicável)
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
        -- Gerar código: VC + ano + mês + 6 dígitos aleatórios
        new_code := 'VC' || TO_CHAR(NOW(), 'YYMM') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
        
        -- Verificar se já existe
        SELECT EXISTS(SELECT 1 FROM vouchers WHERE code = new_code) INTO code_exists;
        
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════
-- INSERIR FORMAS DE PAGAMENTO PADRÃO
-- ═══════════════════════════════════════════════════════
INSERT INTO payment_methods (company_id, name, code, description, accepts_installments, max_installments, icon, color, sort_order)
SELECT 
    c.id,
    pm.name,
    pm.code,
    pm.description,
    pm.accepts_installments,
    pm.max_installments,
    pm.icon,
    pm.color,
    pm.sort_order
FROM companies c
CROSS JOIN (VALUES
    ('Dinheiro', 'dinheiro', 'Pagamento em dinheiro', false, 1, 'Banknote', '#22c55e', 1),
    ('PIX', 'pix', 'Pagamento via PIX', false, 1, 'QrCode', '#8b5cf6', 2),
    ('Cartão de Débito', 'debito', 'Pagamento no débito', false, 1, 'CreditCard', '#3b82f6', 3),
    ('Cartão de Crédito', 'credito', 'Pagamento no crédito', true, 12, 'CreditCard', '#ef4444', 4),
    ('Vale Compra', 'vale_compra', 'Pagamento com vale compra', false, 1, 'Ticket', '#f59e0b', 5)
) AS pm(name, code, description, accepts_installments, max_installments, icon, color, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods WHERE company_id = c.id AND code = pm.code
);

-- ═══════════════════════════════════════════════════════
-- INSERIR TAXAS PADRÃO PARA CARTÃO DE CRÉDITO
-- ═══════════════════════════════════════════════════════
INSERT INTO payment_fees (company_id, payment_method_id, installments, fee_percentage, days_to_receive, description)
SELECT 
    pm.company_id,
    pm.id,
    parcelas.n,
    parcelas.taxa,
    parcelas.dias,
    parcelas.desc
FROM payment_methods pm
CROSS JOIN (VALUES
    (1, 2.99, 30, 'À vista'),
    (2, 3.49, 60, '2x sem juros'),
    (3, 3.99, 90, '3x sem juros'),
    (4, 4.49, 120, '4x sem juros'),
    (5, 4.99, 150, '5x sem juros'),
    (6, 5.49, 180, '6x sem juros'),
    (7, 6.49, 210, '7x com juros'),
    (8, 7.49, 240, '8x com juros'),
    (9, 8.49, 270, '9x com juros'),
    (10, 9.49, 300, '10x com juros'),
    (11, 10.49, 330, '11x com juros'),
    (12, 11.49, 360, '12x com juros')
) AS parcelas(n, taxa, dias, desc)
WHERE pm.code = 'credito'
AND NOT EXISTS (
    SELECT 1 FROM payment_fees WHERE payment_method_id = pm.id AND installments = parcelas.n
);

-- Taxas para débito
INSERT INTO payment_fees (company_id, payment_method_id, installments, fee_percentage, days_to_receive, description)
SELECT 
    pm.company_id,
    pm.id,
    1,
    1.99,
    1,
    'Débito à vista'
FROM payment_methods pm
WHERE pm.code = 'debito'
AND NOT EXISTS (
    SELECT 1 FROM payment_fees WHERE payment_method_id = pm.id AND installments = 1
);

-- Taxas para PIX (geralmente sem taxa ou taxa mínima)
INSERT INTO payment_fees (company_id, payment_method_id, installments, fee_percentage, days_to_receive, description)
SELECT 
    pm.company_id,
    pm.id,
    1,
    0,
    0,
    'PIX instantâneo'
FROM payment_methods pm
WHERE pm.code = 'pix'
AND NOT EXISTS (
    SELECT 1 FROM payment_fees WHERE payment_method_id = pm.id AND installments = 1
);

-- Dinheiro sem taxa
INSERT INTO payment_fees (company_id, payment_method_id, installments, fee_percentage, days_to_receive, description)
SELECT 
    pm.company_id,
    pm.id,
    1,
    0,
    0,
    'Dinheiro à vista'
FROM payment_methods pm
WHERE pm.code = 'dinheiro'
AND NOT EXISTS (
    SELECT 1 FROM payment_fees WHERE payment_method_id = pm.id AND installments = 1
);

-- ═══════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════
SELECT 'Tabelas criadas com sucesso!' as status;
SELECT 'Formas de pagamento:' as info;
SELECT name, code, accepts_installments FROM payment_methods LIMIT 10;

