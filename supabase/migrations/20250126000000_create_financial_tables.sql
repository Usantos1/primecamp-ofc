-- Módulo Financeiro PrimeCamp
-- Tabelas para controle de caixa, contas a pagar e transações

-- Enum para tipos de transação
CREATE TYPE transaction_type AS ENUM ('entrada', 'saida');

-- Enum para tipos de despesa
CREATE TYPE expense_type AS ENUM ('fixa', 'variavel');

-- Enum para status de conta
CREATE TYPE bill_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');

-- Enum para métodos de pagamento
CREATE TYPE payment_method AS ENUM ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'cheque', 'outro');

-- ==========================================
-- Tabela de Categorias Financeiras
-- ==========================================
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

-- Inserir categorias padrão
INSERT INTO financial_categories (name, type, description, color, icon) VALUES
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
('Outros Gastos', 'saida', 'Despesas diversas', '#94a3b8', 'more-horizontal');

-- ==========================================
-- Tabela de Contas a Pagar
-- ==========================================
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
    recurring_day INTEGER, -- Dia do mês para despesas recorrentes
    attachment_url TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    paid_by UUID REFERENCES auth.users(id)
);

-- ==========================================
-- Tabela de Fechamento de Caixa
-- ==========================================
CREATE TABLE IF NOT EXISTS cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    seller_name VARCHAR(200) NOT NULL,
    closing_date DATE NOT NULL,
    
    -- Valores de abertura
    opening_amount DECIMAL(12, 2) NOT NULL DEFAULT 150.00,
    
    -- Valores de fechamento por método
    cash_sales DECIMAL(12, 2) DEFAULT 0, -- Vendas em dinheiro
    pix_sales DECIMAL(12, 2) DEFAULT 0, -- Vendas em PIX
    credit_card_sales DECIMAL(12, 2) DEFAULT 0, -- Vendas cartão crédito
    debit_card_sales DECIMAL(12, 2) DEFAULT 0, -- Vendas cartão débito
    other_sales DECIMAL(12, 2) DEFAULT 0, -- Outras vendas
    
    -- Sangrias e suprimentos
    withdrawals DECIMAL(12, 2) DEFAULT 0, -- Sangrias (retiradas)
    supplies DECIMAL(12, 2) DEFAULT 0, -- Suprimentos (entradas extras)
    
    -- Valores finais
    expected_cash DECIMAL(12, 2) GENERATED ALWAYS AS (
        opening_amount + cash_sales - withdrawals + supplies
    ) STORED,
    actual_cash DECIMAL(12, 2), -- Valor real contado
    difference DECIMAL(12, 2) GENERATED ALWAYS AS (
        actual_cash - (opening_amount + cash_sales - withdrawals + supplies)
    ) STORED,
    
    -- Totais
    total_sales DECIMAL(12, 2) GENERATED ALWAYS AS (
        cash_sales + pix_sales + credit_card_sales + debit_card_sales + other_sales
    ) STORED,
    
    -- Observações
    notes TEXT,
    status VARCHAR(20) DEFAULT 'aberto', -- aberto, fechado, conferido
    
    -- Conferência
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir um fechamento por vendedor por dia
    UNIQUE(seller_id, closing_date)
);

-- ==========================================
-- Tabela de Transações Financeiras
-- ==========================================
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type transaction_type NOT NULL,
    category_id UUID REFERENCES financial_categories(id),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method payment_method,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_id UUID, -- Pode referenciar bill_to_pay ou cash_closing
    reference_type VARCHAR(50), -- 'bill', 'cash_closing', 'manual'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ==========================================
-- Tabela de Alertas Financeiros
-- ==========================================
CREATE TABLE IF NOT EXISTS financial_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills_to_pay(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'vencimento_proximo', 'vencido', 'lembrete'
    message TEXT NOT NULL,
    sent_via VARCHAR(50) DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'sistema'
    sent_to VARCHAR(200),
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'enviado', 'erro'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- Índices para performance
-- ==========================================
CREATE INDEX idx_bills_due_date ON bills_to_pay(due_date);
CREATE INDEX idx_bills_status ON bills_to_pay(status);
CREATE INDEX idx_bills_expense_type ON bills_to_pay(expense_type);
CREATE INDEX idx_cash_closings_date ON cash_closings(closing_date);
CREATE INDEX idx_cash_closings_seller ON cash_closings(seller_id);
CREATE INDEX idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_alerts_bill ON financial_alerts(bill_id);

-- ==========================================
-- Triggers para updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_categories_updated_at
    BEFORE UPDATE ON financial_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_to_pay_updated_at
    BEFORE UPDATE ON bills_to_pay
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_closings_updated_at
    BEFORE UPDATE ON cash_closings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- RLS Policies
-- ==========================================
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills_to_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias (todos podem ver, admin pode editar)
CREATE POLICY "Anyone can view financial categories" ON financial_categories
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage financial categories" ON financial_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para contas a pagar (admin pode tudo)
CREATE POLICY "Admin can manage bills" ON bills_to_pay
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para fechamento de caixa
CREATE POLICY "Users can view own cash closings" ON cash_closings
    FOR SELECT USING (
        seller_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create own cash closings" ON cash_closings
    FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can update own open cash closings" ON cash_closings
    FOR UPDATE USING (
        (seller_id = auth.uid() AND status = 'aberto') OR
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para transações (admin pode tudo)
CREATE POLICY "Admin can manage transactions" ON financial_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view transactions" ON financial_transactions
    FOR SELECT USING (true);

-- Políticas para alertas (admin pode tudo)
CREATE POLICY "Admin can manage alerts" ON financial_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ==========================================
-- View para resumo financeiro
-- ==========================================
CREATE OR REPLACE VIEW financial_summary AS
SELECT
    DATE_TRUNC('month', t.transaction_date) as month,
    t.type,
    fc.name as category_name,
    SUM(t.amount) as total_amount,
    COUNT(*) as transaction_count
FROM financial_transactions t
LEFT JOIN financial_categories fc ON t.category_id = fc.id
GROUP BY DATE_TRUNC('month', t.transaction_date), t.type, fc.name
ORDER BY month DESC, type, category_name;

-- ==========================================
-- Função para verificar contas vencendo
-- ==========================================
CREATE OR REPLACE FUNCTION get_bills_due_soon(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
    id UUID,
    description VARCHAR,
    amount DECIMAL,
    due_date DATE,
    days_until_due INTEGER,
    status bill_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.description,
        b.amount,
        b.due_date,
        (b.due_date - CURRENT_DATE)::INTEGER as days_until_due,
        b.status
    FROM bills_to_pay b
    WHERE b.status = 'pendente'
    AND b.due_date <= CURRENT_DATE + days_ahead
    ORDER BY b.due_date ASC;
END;
$$ LANGUAGE plpgsql;

