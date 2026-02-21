-- ============================================
-- SCRIPT COMPLETO PARA APLICAR MÓDULO FINANCEIRO
-- Execute este script no Supabase Studio > SQL Editor
-- Este script é idempotente (pode ser executado múltiplas vezes)
-- ============================================

-- ============================================
-- 1. CRIAR ENUMS (se não existirem)
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
-- 2. CRIAR TABELA DE CATEGORIAS FINANCEIRAS
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
  ('Vendas à Vista', 'entrada', 'Vendas pagas em dinheiro ou PIX', '#22c55e', 'dollar-sign'),
  ('Vendas Cartão', 'entrada', 'Vendas pagas com cartão', '#3b82f6', 'credit-card'),
  ('Outros Recebimentos', 'entrada', 'Outras entradas de dinheiro', '#8b5cf6', 'plus-circle'),
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
  SELECT 1 FROM financial_categories 
  WHERE financial_categories.name = v.name 
  AND financial_categories.type = v.type::transaction_type
);

-- ============================================
-- 3. CRIAR TABELA DE CONTAS A PAGAR
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

-- ============================================
-- 4. CRIAR TABELA DE FECHAMENTO DE CAIXA
-- ============================================
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
    expected_cash DECIMAL(12, 2) GENERATED ALWAYS AS (
        opening_amount + cash_sales - withdrawals + supplies
    ) STORED,
    actual_cash DECIMAL(12, 2),
    difference DECIMAL(12, 2) GENERATED ALWAYS AS (
        actual_cash - (opening_amount + cash_sales - withdrawals + supplies)
    ) STORED,
    total_sales DECIMAL(12, 2) GENERATED ALWAYS AS (
        cash_sales + pix_sales + credit_card_sales + debit_card_sales + other_sales
    ) STORED,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'aberto',
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seller_id, closing_date)
);

-- ============================================
-- 5. CRIAR TABELA DE TRANSAÇÕES FINANCEIRAS
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

-- ============================================
-- 6. CRIAR TABELA DE ALERTAS FINANCEIROS
-- ============================================
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

-- ============================================
-- 7. CRIAR ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills_to_pay(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills_to_pay(status);
CREATE INDEX IF NOT EXISTS idx_bills_expense_type ON bills_to_pay(expense_type);
CREATE INDEX IF NOT EXISTS idx_cash_closings_date ON cash_closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_cash_closings_seller ON cash_closings(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_bill ON financial_alerts(bill_id);

-- ============================================
-- 8. CRIAR FUNÇÃO DE UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 9. CRIAR TRIGGERS DE UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_financial_categories_updated_at ON financial_categories;
CREATE TRIGGER update_financial_categories_updated_at
    BEFORE UPDATE ON financial_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_to_pay_updated_at ON bills_to_pay;
CREATE TRIGGER update_bills_to_pay_updated_at
    BEFORE UPDATE ON bills_to_pay
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cash_closings_updated_at ON cash_closings;
CREATE TRIGGER update_cash_closings_updated_at
    BEFORE UPDATE ON cash_closings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_transactions_updated_at ON financial_transactions;
CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. HABILITAR RLS
-- ============================================
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills_to_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. CRIAR POLÍTICAS RLS
-- ============================================
-- Categorias
DROP POLICY IF EXISTS "Anyone can view financial categories" ON financial_categories;
CREATE POLICY "Anyone can view financial categories" ON financial_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage financial categories" ON financial_categories;
CREATE POLICY "Admin can manage financial categories" ON financial_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Contas a pagar
DROP POLICY IF EXISTS "Admin can manage bills" ON bills_to_pay;
CREATE POLICY "Admin can manage bills" ON bills_to_pay
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Fechamento de caixa
DROP POLICY IF EXISTS "Users can view own cash closings" ON cash_closings;
CREATE POLICY "Users can view own cash closings" ON cash_closings
    FOR SELECT USING (
        seller_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can create own cash closings" ON cash_closings;
CREATE POLICY "Users can create own cash closings" ON cash_closings
    FOR INSERT WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own open cash closings" ON cash_closings;
CREATE POLICY "Users can update own open cash closings" ON cash_closings
    FOR UPDATE USING (
        (seller_id = auth.uid() AND status = 'aberto') OR
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Transações
DROP POLICY IF EXISTS "Admin can manage transactions" ON financial_transactions;
CREATE POLICY "Admin can manage transactions" ON financial_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view transactions" ON financial_transactions;
CREATE POLICY "Users can view transactions" ON financial_transactions
    FOR SELECT USING (true);

-- Alertas
DROP POLICY IF EXISTS "Admin can manage alerts" ON financial_alerts;
CREATE POLICY "Admin can manage alerts" ON financial_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- 12. CRIAR VIEW DE RESUMO FINANCEIRO
-- ============================================
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

-- ============================================
-- 13. CRIAR FUNÇÃO PARA CONTAS VENCENDO
-- ============================================
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

-- ============================================
-- 14. INTEGRAÇÃO DE VENDAS COM TRANSAÇÕES
-- ============================================
CREATE OR REPLACE FUNCTION create_financial_transaction_from_sale(
  p_sale_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_sale RECORD;
  v_category_id UUID;
  v_transaction_id UUID;
  v_payment_method TEXT := 'pix';
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada: %', p_sale_id;
  END IF;
  IF v_sale.status != 'paid' THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_category_id
  FROM financial_categories
  WHERE type = 'entrada' AND name LIKE '%Venda%'
  LIMIT 1;
  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE type = 'entrada'
    LIMIT 1;
  END IF;
  SELECT forma_pagamento INTO v_payment_method
  FROM payments
  WHERE sale_id = p_sale_id AND status = 'confirmed'
  ORDER BY valor DESC LIMIT 1;
  IF v_payment_method = 'dinheiro' THEN
    v_payment_method := 'dinheiro';
  ELSIF v_payment_method = 'pix' THEN
    v_payment_method := 'pix';
  ELSIF v_payment_method = 'debito' THEN
    v_payment_method := 'cartao_debito';
  ELSIF v_payment_method = 'credito' THEN
    v_payment_method := 'cartao_credito';
  ELSE
    v_payment_method := 'outro';
  END IF;
  INSERT INTO financial_transactions (
    type, category_id, description, amount, payment_method,
    transaction_date, reference_id, reference_type, notes, created_by
  ) VALUES (
    'entrada', v_category_id,
    'Venda #' || v_sale.numero || COALESCE(' - ' || v_sale.cliente_nome, ''),
    v_sale.total, v_payment_method::payment_method,
    COALESCE(v_sale.finalized_at::DATE, CURRENT_DATE),
    p_sale_id, 'sale',
    'Transação criada automaticamente a partir da venda #' || v_sale.numero,
    v_sale.vendedor_id
  ) RETURNING id INTO v_transaction_id;
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_create_transaction_on_sale_finalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    IF NOT EXISTS (
      SELECT 1 FROM financial_transactions
      WHERE reference_id = NEW.id AND reference_type = 'sale'
    ) THEN
      PERFORM create_financial_transaction_from_sale(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sale_to_financial_transaction ON sales;
CREATE TRIGGER trigger_sale_to_financial_transaction
  AFTER UPDATE OF status ON sales
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION trigger_create_transaction_on_sale_finalize();

CREATE OR REPLACE FUNCTION sync_old_sales_to_transactions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_sale RECORD;
BEGIN
  FOR v_sale IN
    SELECT s.* FROM sales s
    WHERE s.status = 'paid'
    AND NOT EXISTS (
      SELECT 1 FROM financial_transactions
      WHERE reference_id = s.id AND reference_type = 'sale'
    )
  LOOP
    PERFORM create_financial_transaction_from_sale(v_sale.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 15. INTEGRAÇÃO DE CAIXA DO PDV
-- ============================================
CREATE OR REPLACE FUNCTION create_cash_closing_from_session(
  p_session_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_session RECORD;
  v_closing_id UUID;
  v_cash_sales DECIMAL(12, 2) := 0;
  v_pix_sales DECIMAL(12, 2) := 0;
  v_credit_card_sales DECIMAL(12, 2) := 0;
  v_debit_card_sales DECIMAL(12, 2) := 0;
  v_other_sales DECIMAL(12, 2) := 0;
  v_withdrawals DECIMAL(12, 2) := 0;
  v_supplies DECIMAL(12, 2) := 0;
  v_payment RECORD;
BEGIN
  SELECT * INTO v_session FROM cash_register_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão de caixa não encontrada: %', p_session_id;
  END IF;
  IF v_session.status != 'closed' THEN
    RAISE EXCEPTION 'Sessão de caixa ainda está aberta';
  END IF;
  IF EXISTS (
    SELECT 1 FROM cash_closings
    WHERE seller_id = v_session.operador_id
    AND closing_date = v_session.closed_at::DATE
  ) THEN
    RAISE EXCEPTION 'Fechamento já existe para esta sessão';
  END IF;
  FOR v_payment IN
    SELECT p.forma_pagamento, SUM(p.valor) as total
    FROM payments p
    INNER JOIN sales s ON s.id = p.sale_id
    WHERE s.cash_register_session_id = p_session_id
    AND p.status = 'confirmed' AND s.status = 'paid'
    GROUP BY p.forma_pagamento
  LOOP
    IF v_payment.forma_pagamento = 'dinheiro' THEN
      v_cash_sales := v_payment.total;
    ELSIF v_payment.forma_pagamento = 'pix' THEN
      v_pix_sales := v_payment.total;
    ELSIF v_payment.forma_pagamento = 'debito' THEN
      v_debit_card_sales := v_payment.total;
    ELSIF v_payment.forma_pagamento = 'credito' THEN
      v_credit_card_sales := v_payment.total;
    ELSE
      v_other_sales := v_other_sales + v_payment.total;
    END IF;
  END LOOP;
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'sangria' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END), 0)
  INTO v_withdrawals, v_supplies
  FROM cash_movements WHERE session_id = p_session_id;
  INSERT INTO cash_closings (
    seller_id, seller_name, closing_date, opening_amount,
    cash_sales, pix_sales, credit_card_sales, debit_card_sales, other_sales,
    withdrawals, supplies, actual_cash, notes, status
  ) VALUES (
    v_session.operador_id, v_session.operador_nome, v_session.closed_at::DATE,
    v_session.valor_inicial, v_cash_sales, v_pix_sales, v_credit_card_sales,
    v_debit_card_sales, v_other_sales, v_withdrawals, v_supplies,
    v_session.valor_final,
    COALESCE('Fechamento automático da sessão #' || v_session.numero || 
      CASE WHEN v_session.divergencia IS NOT NULL AND v_session.divergencia != 0 
        THEN '. Divergência: ' || v_session.divergencia::TEXT ELSE '' END, ''),
    'fechado'
  ) RETURNING id INTO v_closing_id;
  RETURN v_closing_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. VERIFICAR RESULTADO
-- ============================================
SELECT 
  '✅ Categorias criadas: ' || COUNT(*)::TEXT as resultado
FROM financial_categories;

SELECT 
  '✅ Funções criadas com sucesso!' as status,
  proname as funcao
FROM pg_proc
WHERE proname IN (
  'create_financial_transaction_from_sale',
  'trigger_create_transaction_on_sale_finalize',
  'sync_old_sales_to_transactions',
  'create_cash_closing_from_session',
  'get_bills_due_soon'
);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- ✅ Todas as tabelas, funções, triggers e políticas foram criadas
-- ✅ Categorias financeiras padrão foram inseridas
-- ✅ Integrações automáticas estão configuradas
-- ============================================

