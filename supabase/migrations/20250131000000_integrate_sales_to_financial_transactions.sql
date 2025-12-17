-- ============================================
-- INTEGRAÇÃO DE VENDAS COM TRANSAÇÕES FINANCEIRAS
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

-- Comentários
COMMENT ON FUNCTION create_financial_transaction_from_sale IS 'Cria uma transação financeira de entrada a partir de uma venda finalizada';
COMMENT ON FUNCTION trigger_create_transaction_on_sale_finalize IS 'Trigger que cria transação financeira automaticamente quando venda é finalizada';
COMMENT ON FUNCTION sync_old_sales_to_transactions IS 'Sincroniza vendas antigas que ainda não têm transação financeira';

