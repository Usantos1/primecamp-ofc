-- EXECUTE ESTE SQL NO SUPABASE DASHBOARD
-- Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij/sql/new

-- Módulo Financeiro PrimeCamp

-- Enum para tipos de transação
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('entrada', 'saida');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para tipos de despesa
DO $$ BEGIN
    CREATE TYPE expense_type AS ENUM ('fixa', 'variavel');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para status de conta
DO $$ BEGIN
    CREATE TYPE bill_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para métodos de pagamento
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'cheque', 'outro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de Categorias Financeiras
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

-- Inserir categorias padrão (só se não existirem)
INSERT INTO financial_categories (name, type, description, color, icon) 
SELECT * FROM (VALUES
    ('Vendas à Vista', 'entrada'::transaction_type, 'Vendas pagas em dinheiro ou PIX', '#22c55e', 'dollar-sign'),
    ('Vendas Cartão', 'entrada'::transaction_type, 'Vendas pagas com cartão', '#3b82f6', 'credit-card'),
    ('Outros Recebimentos', 'entrada'::transaction_type, 'Outras entradas de dinheiro', '#8b5cf6', 'plus-circle'),
    ('Fornecedores', 'saida'::transaction_type, 'Pagamentos a fornecedores', '#ef4444', 'truck'),
    ('Salários', 'saida'::transaction_type, 'Pagamento de funcionários', '#f97316', 'users'),
    ('Aluguel', 'saida'::transaction_type, 'Despesas com aluguel', '#eab308', 'home'),
    ('Energia/Água', 'saida'::transaction_type, 'Contas de consumo', '#06b6d4', 'zap'),
    ('Internet/Telefone', 'saida'::transaction_type, 'Telecomunicações', '#6366f1', 'wifi'),
    ('Material de Escritório', 'saida'::transaction_type, 'Papelaria e suprimentos', '#ec4899', 'file-text'),
    ('Manutenção', 'saida'::transaction_type, 'Reparos e manutenções', '#84cc16', 'tool'),
    ('Marketing', 'saida'::transaction_type, 'Publicidade e marketing', '#f43f5e', 'megaphone'),
    ('Impostos', 'saida'::transaction_type, 'Tributos e taxas', '#64748b', 'file-minus'),
    ('Outros Gastos', 'saida'::transaction_type, 'Despesas diversas', '#94a3b8', 'more-horizontal')
) AS t(name, type, description, color, icon)
WHERE NOT EXISTS (SELECT 1 FROM financial_categories LIMIT 1);

-- Tabela de Contas a Pagar
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

-- Tabela de Fechamento de Caixa
CREATE TABLE IF NOT EXISTS cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    seller_name VARCHAR(200) NOT NULL,
    closing_date DATE NOT NULL,
    opening_amount DECIMAL(12, 2) NOT NULL DEFAULT 150.00,
    cash_sales DECIMAL(12, 2) DEFAULT 0,
    pix_sales DECIMAL(12, 2) DEFAULT 0,
    credit_card_sales DECIMAL(12, 2) DEFAULT 0,
    debit_card_sales DECIMAL(12, 2) DEFAULT 0,
    other_sales DECIMAL(12, 2) DEFAULT 0,
    withdrawals DECIMAL(12, 2) DEFAULT 0,
    supplies DECIMAL(12, 2) DEFAULT 0,
    expected_cash DECIMAL(12, 2) GENERATED ALWAYS AS (opening_amount + cash_sales - withdrawals + supplies) STORED,
    actual_cash DECIMAL(12, 2),
    difference DECIMAL(12, 2) GENERATED ALWAYS AS (actual_cash - (opening_amount + cash_sales - withdrawals + supplies)) STORED,
    total_sales DECIMAL(12, 2) GENERATED ALWAYS AS (cash_sales + pix_sales + credit_card_sales + debit_card_sales + other_sales) STORED,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'aberto',
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seller_id, closing_date)
);

-- Tabela de Transações Financeiras
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

-- Tabela de Alertas Financeiros
CREATE TABLE IF NOT EXISTS financial_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills_to_pay(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sent_via VARCHAR(50) DEFAULT 'whatsapp',
    sent_to VARCHAR(200),
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pendente',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills_to_pay(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills_to_pay(status);
CREATE INDEX IF NOT EXISTS idx_bills_expense_type ON bills_to_pay(expense_type);
CREATE INDEX IF NOT EXISTS idx_cash_closings_date ON cash_closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_cash_closings_seller ON cash_closings(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_bill ON financial_alerts(bill_id);

-- RLS
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills_to_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas (criar apenas se não existirem)
DO $$ BEGIN
    CREATE POLICY "Anyone can view financial categories" ON financial_categories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can manage financial categories" ON financial_categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can manage bills" ON bills_to_pay FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view own cash closings" ON cash_closings FOR SELECT USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own cash closings" ON cash_closings FOR INSERT WITH CHECK (seller_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own open cash closings" ON cash_closings FOR UPDATE USING ((seller_id = auth.uid() AND status = 'aberto') OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can manage transactions" ON financial_transactions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view transactions" ON financial_transactions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can manage alerts" ON financial_alerts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Confirmação
SELECT 'Módulo Financeiro instalado com sucesso!' as status;


