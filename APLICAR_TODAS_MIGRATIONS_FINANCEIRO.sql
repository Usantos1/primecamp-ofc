-- ============================================
-- APLICAR TODAS AS MIGRATIONS DO MÓDULO FINANCEIRO
-- Execute este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('entrada', 'saida');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_type AS ENUM ('fixa', 'variavel');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bill_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'cheque', 'outro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. TABELA DE CATEGORIAS FINANCEIRAS
-- ============================================
CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type transaction_type NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT 'folder',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Inserir categorias padrão (apenas se não existirem)
INSERT INTO financial_categories (name, type, description, color, icon)
SELECT * FROM (VALUES
    -- Entradas
    ('Vendas à Vista', 'entrada', 'Vendas pagas em dinheiro ou PIX', '#22c55e', 'dollar-sign'),
    ('Vendas Cartão', 'entrada', 'Vendas pagas com cartão', '#3b82f6', 'credit-card'),
    ('Outros Recebimentos', 'entrada', 'Outras entradas de dinheiro', '#8b5cf6', 'plus-circle'),
    -- Saídas
    ('Fornecedores', 'saida', 'Pagamentos a fornecedores', '#ef4444', 'truck'),
    ('Salários', 'saida', 'Pagamento de funcionários', '#f97316', 'users'),
    ('Aluguel', 'saida', 'Despesas com aluguel', '#eab308', 'home'),
    ('Energia/Água', 'saida', 'Contas de consumo', '#06b6d4', 'zap'),
    ('Internet/Telefone', 'saida', 'Telecomunicações', '#6366f1', 'wifi'),
    ('Material de Escritório', 'saida', 'Papelaria e suprimentos', '#ec4899', 'file-text'),
    ('Manutenção', 'saida', 'Reparos e manutenções', '#84cc16', 'tool'),
    ('Marketing', 'saida', 'Publicidade e marketing', '#f43f5e', 'megaphone'),
    ('Impostos', 'saida', 'Tributos e taxas', '#64748b', 'file-minus'),
    ('Outros Gastos', 'saida', 'Despesas diversas', '#94a3b8', 'more-horizontal')
) AS v(name, type, description, color, icon)
WHERE NOT EXISTS (
    SELECT 1 FROM financial_categories WHERE financial_categories.name = v.name
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_financial_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_financial_categories_updated_at ON financial_categories;
CREATE TRIGGER update_financial_categories_updated_at
    BEFORE UPDATE ON financial_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_categories_updated_at();

-- RLS Policies
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view financial categories" ON financial_categories;
CREATE POLICY "Anyone can view financial categories" ON financial_categories
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin can manage financial categories" ON financial_categories;
CREATE POLICY "Admin can manage financial categories" ON financial_categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 3. TABELA DE CONTAS A PAGAR
-- ============================================
CREATE TABLE IF NOT EXISTS bills_to_pay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category_id UUID REFERENCES financial_categories(id),
    expense_type expense_type NOT NULL DEFAULT 'variavel',
    due_date DATE NOT NULL,
    payment_date DATE,
    status bill_status DEFAULT 'pendente',
    payment_method payment_method,
    supplier VARCHAR(200),
    notes TEXT,
    recurring BOOLEAN DEFAULT false,
    recurring_day INTEGER,
    attachment_url TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    paid_by UUID REFERENCES auth.users(id)
);

-- Índices para bills_to_pay
CREATE INDEX IF NOT EXISTS idx_bills_to_pay_status ON bills_to_pay(status);
CREATE INDEX IF NOT EXISTS idx_bills_to_pay_due_date ON bills_to_pay(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_to_pay_category_id ON bills_to_pay(category_id);
CREATE INDEX IF NOT EXISTS idx_bills_to_pay_recurring ON bills_to_pay(recurring);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_bills_to_pay_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bills_to_pay_updated_at ON bills_to_pay;
CREATE TRIGGER update_bills_to_pay_updated_at
    BEFORE UPDATE ON bills_to_pay
    FOR EACH ROW
    EXECUTE FUNCTION update_bills_to_pay_updated_at();

-- RLS Policies
ALTER TABLE bills_to_pay ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bills to pay" ON bills_to_pay;
CREATE POLICY "Users can view bills to pay" ON bills_to_pay
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can create bills to pay" ON bills_to_pay;
CREATE POLICY "Users can create bills to pay" ON bills_to_pay
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update bills to pay" ON bills_to_pay;
CREATE POLICY "Users can update bills to pay" ON bills_to_pay
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete bills to pay" ON bills_to_pay;
CREATE POLICY "Users can delete bills to pay" ON bills_to_pay
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 4. TABELA DE FECHAMENTO DE CAIXA
-- ============================================
CREATE TABLE IF NOT EXISTS cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    seller_name VARCHAR(200) NOT NULL,
    closing_date DATE NOT NULL,
    
    -- Valores de abertura
    opening_amount DECIMAL(12, 2) NOT NULL DEFAULT 150.00,
    
    -- Valores de fechamento por método
    cash_sales DECIMAL(12, 2) DEFAULT 0,
    pix_sales DECIMAL(12, 2) DEFAULT 0,
    credit_card_sales DECIMAL(12, 2) DEFAULT 0,
    debit_card_sales DECIMAL(12, 2) DEFAULT 0,
    other_sales DECIMAL(12, 2) DEFAULT 0,
    
    -- Sangrias e suprimentos
    withdrawals DECIMAL(12, 2) DEFAULT 0,
    supplies DECIMAL(12, 2) DEFAULT 0,
    
    -- Valores finais
    expected_cash DECIMAL(12, 2) GENERATED ALWAYS AS (
        opening_amount + cash_sales - withdrawals + supplies
    ) STORED,
    actual_cash DECIMAL(12, 2),
    difference DECIMAL(12, 2) GENERATED ALWAYS AS (
        actual_cash - (opening_amount + cash_sales - withdrawals + supplies)
    ) STORED,
    
    -- Totais
    total_sales DECIMAL(12, 2) GENERATED ALWAYS AS (
        cash_sales + pix_sales + credit_card_sales + debit_card_sales + other_sales
    ) STORED,
    
    -- Observações
    notes TEXT,
    status VARCHAR(20) DEFAULT 'aberto',
    
    -- Conferência
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir um fechamento por vendedor por dia
    UNIQUE(seller_id, closing_date)
);

-- ============================================
-- 5. TABELA DE TRANSAÇÕES FINANCEIRAS
-- ============================================
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type transaction_type NOT NULL,
    category_id UUID REFERENCES financial_categories(id),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method payment_method,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_id UUID,
    reference_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category_id);

-- ============================================
-- 6. TABELA DE ALERTAS FINANCEIROS
-- ============================================
CREATE TABLE IF NOT EXISTS financial_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills_to_pay(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sent_via VARCHAR(20),
    sent_to VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pendente',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. VERIFICAR E CRIAR ÍNDICES FALTANTES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cash_closings_seller_id ON cash_closings(seller_id);
CREATE INDEX IF NOT EXISTS idx_cash_closings_date ON cash_closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_bill_id ON financial_alerts(bill_id);

-- ============================================
-- 8. VERIFICAR SE AS TABELAS FORAM CRIADAS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando tabelas...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_categories') THEN
        RAISE NOTICE '✓ Tabela financial_categories existe';
    ELSE
        RAISE EXCEPTION '✗ Tabela financial_categories NÃO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bills_to_pay') THEN
        RAISE NOTICE '✓ Tabela bills_to_pay existe';
    ELSE
        RAISE EXCEPTION '✗ Tabela bills_to_pay NÃO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_closings') THEN
        RAISE NOTICE '✓ Tabela cash_closings existe';
    ELSE
        RAISE EXCEPTION '✗ Tabela cash_closings NÃO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
        RAISE NOTICE '✓ Tabela financial_transactions existe';
    ELSE
        RAISE EXCEPTION '✗ Tabela financial_transactions NÃO existe';
    END IF;
    
    RAISE NOTICE 'Todas as tabelas foram criadas com sucesso!';
END $$;

