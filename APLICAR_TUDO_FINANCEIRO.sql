-- ============================================
-- APLICAR TODAS AS MIGRATIONS DE FINANCEIRO
-- Execute este script completo no Supabase Studio > SQL Editor
-- ============================================

-- ============================================
-- 1. VERIFICAR/CRIAR TABELAS FINANCEIRAS
-- ============================================

-- Verificar se a tabela financial_categories existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'financial_categories'
  ) THEN
    -- Criar enum types se não existirem
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

    -- Criar tabela de categorias
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
    ('Outros Gastos', 'saida', 'Despesas diversas', '#94a3b8', 'more-horizontal')
    ON CONFLICT DO NOTHING;

    -- Habilitar RLS
    ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
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
  END IF;
END $$;

-- ============================================
-- 2. APLICAR INTEGRAÇÃO DE VENDAS COM TRANSAÇÕES
-- ============================================

-- Função para criar transação financeira a partir de uma venda
CREATE OR REPLACE FUNCTION create_financial_transaction_from_sale(
  p_sale_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_sale RECORD;
  v_category_id UUID;
  v_transaction_id UUID;
  v_payment_method TEXT := 'pix'; -- Default
BEGIN
  -- Buscar dados da venda
  SELECT * INTO v_sale
  FROM sales
  WHERE id = p_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada: %', p_sale_id;
  END IF;

  -- Só criar transação se a venda estiver paga
  IF v_sale.status != 'paid' THEN
    RETURN NULL;
  END IF;

  -- Buscar categoria de vendas (entrada)
  SELECT id INTO v_category_id
  FROM financial_categories
  WHERE type = 'entrada'
  AND name LIKE '%Venda%'
  LIMIT 1;

  -- Se não encontrar, usar a primeira categoria de entrada
  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE type = 'entrada'
    LIMIT 1;
  END IF;

  -- Determinar método de pagamento baseado nos pagamentos da venda
  SELECT forma_pagamento INTO v_payment_method
  FROM payments
  WHERE sale_id = p_sale_id
  AND status = 'confirmed'
  ORDER BY valor DESC
  LIMIT 1;

  -- Mapear forma_pagamento para payment_method
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

  -- Criar transação financeira
  INSERT INTO financial_transactions (
    type,
    category_id,
    description,
    amount,
    payment_method,
    transaction_date,
    reference_id,
    reference_type,
    notes,
    created_by
  ) VALUES (
    'entrada',
    v_category_id,
    'Venda #' || v_sale.numero || COALESCE(' - ' || v_sale.cliente_nome, ''),
    v_sale.total,
    v_payment_method::payment_method,
    COALESCE(v_sale.finalized_at::DATE, CURRENT_DATE),
    p_sale_id,
    'sale',
    'Transação criada automaticamente a partir da venda #' || v_sale.numero,
    v_sale.vendedor_id
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar transação quando venda é finalizada
CREATE OR REPLACE FUNCTION trigger_create_transaction_on_sale_finalize()
RETURNS TRIGGER AS $$
BEGIN
  -- Só criar transação se mudou para 'paid' e não existe ainda
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Verificar se já existe transação para esta venda
    IF NOT EXISTS (
      SELECT 1 FROM financial_transactions
      WHERE reference_id = NEW.id
      AND reference_type = 'sale'
    ) THEN
      PERFORM create_financial_transaction_from_sale(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sale_to_financial_transaction ON sales;
CREATE TRIGGER trigger_sale_to_financial_transaction
  AFTER UPDATE OF status ON sales
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION trigger_create_transaction_on_sale_finalize();

-- Função para sincronizar vendas antigas (backfill)
CREATE OR REPLACE FUNCTION sync_old_sales_to_transactions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_sale RECORD;
BEGIN
  FOR v_sale IN
    SELECT s.*
    FROM sales s
    WHERE s.status = 'paid'
    AND NOT EXISTS (
      SELECT 1 FROM financial_transactions
      WHERE reference_id = s.id
      AND reference_type = 'sale'
    )
  LOOP
    PERFORM create_financial_transaction_from_sale(v_sale.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. APLICAR INTEGRAÇÃO DE CAIXA DO PDV
-- ============================================

-- Função para criar fechamento de caixa a partir de uma sessão de caixa do PDV
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
  -- Buscar dados da sessão
  SELECT * INTO v_session
  FROM cash_register_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão de caixa não encontrada: %', p_session_id;
  END IF;

  -- Só criar fechamento se a sessão estiver fechada
  IF v_session.status != 'closed' THEN
    RAISE EXCEPTION 'Sessão de caixa ainda está aberta';
  END IF;

  -- Verificar se já existe fechamento para esta sessão
  IF EXISTS (
    SELECT 1 FROM cash_closings
    WHERE seller_id = v_session.operador_id
    AND closing_date = v_session.closed_at::DATE
  ) THEN
    RAISE EXCEPTION 'Fechamento já existe para esta sessão';
  END IF;

  -- Calcular vendas por método de pagamento
  FOR v_payment IN
    SELECT 
      p.forma_pagamento,
      SUM(p.valor) as total
    FROM payments p
    INNER JOIN sales s ON s.id = p.sale_id
    WHERE s.cash_register_session_id = p_session_id
    AND p.status = 'confirmed'
    AND s.status = 'paid'
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

  -- Calcular sangrias e suprimentos
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'sangria' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END), 0)
  INTO v_withdrawals, v_supplies
  FROM cash_movements
  WHERE session_id = p_session_id;

  -- Criar fechamento de caixa
  INSERT INTO cash_closings (
    seller_id,
    seller_name,
    closing_date,
    opening_amount,
    cash_sales,
    pix_sales,
    credit_card_sales,
    debit_card_sales,
    other_sales,
    withdrawals,
    supplies,
    actual_cash,
    notes,
    status
  ) VALUES (
    v_session.operador_id,
    v_session.operador_nome,
    v_session.closed_at::DATE,
    v_session.valor_inicial,
    v_cash_sales,
    v_pix_sales,
    v_credit_card_sales,
    v_debit_card_sales,
    v_other_sales,
    v_withdrawals,
    v_supplies,
    v_session.valor_final,
    COALESCE('Fechamento automático da sessão #' || v_session.numero || 
      CASE WHEN v_session.divergencia IS NOT NULL AND v_session.divergencia != 0 
        THEN '. Divergência: ' || v_session.divergencia::TEXT 
        ELSE '' 
      END, ''),
    'fechado'
  )
  RETURNING id INTO v_closing_id;

  RETURN v_closing_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. VERIFICAR RESULTADO
-- ============================================

-- Verificar categorias criadas
SELECT 
  'Categorias criadas: ' || COUNT(*)::TEXT as resultado
FROM financial_categories;

-- Verificar funções criadas
SELECT 
  'Funções criadas com sucesso!' as status,
  proname as funcao
FROM pg_proc
WHERE proname IN (
  'create_financial_transaction_from_sale',
  'trigger_create_transaction_on_sale_finalize',
  'sync_old_sales_to_transactions',
  'create_cash_closing_from_session'
);

-- ============================================
-- FIM DO SCRIPT
-- ============================================

