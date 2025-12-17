-- ============================================
-- INTEGRAÇÃO DE CAIXA DO PDV COM FECHAMENTO FINANCEIRO
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

-- Comentários
COMMENT ON FUNCTION create_cash_closing_from_session IS 'Cria um fechamento de caixa financeiro a partir de uma sessão de caixa do PDV fechada';

