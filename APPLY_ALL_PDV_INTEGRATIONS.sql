-- ============================================
-- APLICAR TODAS AS INTEGRAÇÕES PDV
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- ============================================
-- 1. ADICIONAR CAMPO cash_register_session_id
-- ============================================
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cash_register_session_id UUID REFERENCES public.cash_register_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_cash_register_session_id ON public.sales(cash_register_session_id);

-- ============================================
-- 2. ADICIONAR CAMPOS DE INTEGRAÇÃO NA TABELA SALES
-- ============================================

-- Campo para indicar se já foi integrado ao financeiro
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS financial_integrated BOOLEAN DEFAULT false;

-- Campo para indicar se estoque foi baixado
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS stock_decremented BOOLEAN DEFAULT false;

-- Campo para indicar se OS foi faturada
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS os_faturada BOOLEAN DEFAULT false;

-- Índices
CREATE INDEX IF NOT EXISTS idx_sales_financial_integrated ON public.sales(financial_integrated);
CREATE INDEX IF NOT EXISTS idx_sales_stock_decremented ON public.sales(stock_decremented);
CREATE INDEX IF NOT EXISTS idx_sales_os_faturada ON public.sales(os_faturada);

-- ============================================
-- 3. TABELA DE CONTAS A RECEBER
-- ============================================
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  ordem_servico_id UUID, -- Referência opcional a OS
  
  -- Cliente
  cliente_id UUID,
  cliente_nome TEXT NOT NULL,
  cliente_cpf_cnpj TEXT,
  
  -- Valores
  valor_total NUMERIC(12,2) NOT NULL,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_restante NUMERIC(12,2) GENERATED ALWAYS AS (valor_total - valor_pago) STORED,
  
  -- Datas
  data_vencimento DATE,
  data_pagamento DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'parcial', 'pago', 'atrasado', 'cancelado')),
  
  -- Observações
  observacoes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Índices para contas a receber
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_sale_id ON public.accounts_receivable(sale_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_os_id ON public.accounts_receivable(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON public.accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_vencimento ON public.accounts_receivable(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_cliente_id ON public.accounts_receivable(cliente_id);

-- ============================================
-- 4. FUNÇÃO PARA INTEGRAR VENDA AO FINANCEIRO
-- ============================================
CREATE OR REPLACE FUNCTION integrate_sale_to_financial(p_sale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sale RECORD;
  v_category_id UUID;
  v_transaction_id UUID;
  v_account_receivable_id UUID;
  v_payment_method TEXT;
BEGIN
  -- Buscar dados da venda
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Se já foi integrado, não fazer nada
  IF v_sale.financial_integrated THEN
    RETURN TRUE;
  END IF;
  
  -- Buscar categoria financeira baseada no método de pagamento
  -- Primeiro, buscar o método de pagamento mais usado na venda
  SELECT forma_pagamento INTO v_payment_method
  FROM public.payments
  WHERE sale_id = p_sale_id
    AND status = 'confirmed'
  ORDER BY valor DESC
  LIMIT 1;
  
  -- Mapear método de pagamento para categoria
  IF v_payment_method IN ('dinheiro', 'pix') THEN
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE name = 'Vendas à Vista'
    LIMIT 1;
  ELSIF v_payment_method IN ('credito', 'debito', 'cartao_credito', 'cartao_debito') THEN
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE name = 'Vendas Cartão'
    LIMIT 1;
  ELSE
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE name = 'Outros Recebimentos'
    LIMIT 1;
  END IF;
  
  -- Se venda está totalmente paga, criar transação financeira
  IF v_sale.status = 'paid' AND v_sale.total_pago >= v_sale.total THEN
    -- Criar transação financeira de entrada
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
      'Venda #' || v_sale.numero || ' - ' || COALESCE(v_sale.cliente_nome, 'Cliente não informado'),
      v_sale.total,
      CASE 
        WHEN v_payment_method = 'dinheiro' THEN 'dinheiro'
        WHEN v_payment_method = 'pix' THEN 'pix'
        WHEN v_payment_method IN ('credito', 'cartao_credito') THEN 'cartao_credito'
        WHEN v_payment_method IN ('debito', 'cartao_debito') THEN 'cartao_debito'
        ELSE 'outro'
      END::payment_method,
      DATE(v_sale.finalized_at),
      p_sale_id,
      'sale',
      'Venda finalizada via PDV',
      v_sale.vendedor_id
    ) RETURNING id INTO v_transaction_id;
    
  -- Se venda está parcialmente paga ou aberta, criar conta a receber
  ELSIF v_sale.status IN ('open', 'partial') AND v_sale.total_pago < v_sale.total THEN
    -- Criar conta a receber
    INSERT INTO public.accounts_receivable (
      sale_id,
      ordem_servico_id,
      cliente_id,
      cliente_nome,
      cliente_cpf_cnpj,
      valor_total,
      valor_pago,
      data_vencimento,
      status,
      observacoes
    ) VALUES (
      p_sale_id,
      v_sale.ordem_servico_id,
      v_sale.cliente_id,
      COALESCE(v_sale.cliente_nome, 'Cliente não informado'),
      v_sale.cliente_cpf_cnpj,
      v_sale.total,
      v_sale.total_pago,
      DATE(v_sale.finalized_at) + INTERVAL '30 days', -- Vencimento padrão: 30 dias
      CASE 
        WHEN v_sale.total_pago > 0 THEN 'parcial'
        ELSE 'pendente'
      END,
      'Venda #' || v_sale.numero || ' - Gerado automaticamente pelo PDV'
    ) RETURNING id INTO v_account_receivable_id;
    
    -- Se já tem algum pagamento, criar transação para o valor pago
    IF v_sale.total_pago > 0 THEN
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
        'Pagamento parcial - Venda #' || v_sale.numero,
        v_sale.total_pago,
        CASE 
          WHEN v_payment_method = 'dinheiro' THEN 'dinheiro'
          WHEN v_payment_method = 'pix' THEN 'pix'
          WHEN v_payment_method IN ('credito', 'cartao_credito') THEN 'cartao_credito'
          WHEN v_payment_method IN ('debito', 'cartao_debito') THEN 'cartao_debito'
          ELSE 'outro'
        END::payment_method,
        DATE(v_sale.finalized_at),
        p_sale_id,
        'sale',
        'Pagamento parcial da venda',
        v_sale.vendedor_id
      );
    END IF;
  END IF;
  
  -- Marcar venda como integrada
  UPDATE public.sales
  SET financial_integrated = true
  WHERE id = p_sale_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao integrar venda ao financeiro: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. FUNÇÃO PARA REVERTER ESTOQUE (CANCELAMENTO)
-- ============================================
CREATE OR REPLACE FUNCTION revert_stock_from_sale(p_sale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Buscar todos os itens da venda
  FOR v_item IN 
    SELECT produto_id, quantidade, produto_tipo
    FROM public.sale_items
    WHERE sale_id = p_sale_id
      AND produto_tipo = 'produto'
      AND produto_id IS NOT NULL
  LOOP
    -- Reverter estoque (adicionar de volta)
    UPDATE public.produtos
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_item.quantidade
    WHERE id = v_item.produto_id;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao reverter estoque: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. FUNÇÃO PARA FATURAR OS
-- ============================================
CREATE OR REPLACE FUNCTION fatura_os_from_sale(p_sale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sale RECORD;
BEGIN
  -- Buscar dados da venda
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id;
  
  IF NOT FOUND OR v_sale.ordem_servico_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Marcar venda como OS faturada
  UPDATE public.sales
  SET os_faturada = true
  WHERE id = p_sale_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao faturar OS: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNÇÃO PARA ATUALIZAR CONTA A RECEBER QUANDO PAGAMENTO É CONFIRMADO
-- ============================================
CREATE OR REPLACE FUNCTION update_accounts_receivable_on_payment(p_sale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sale RECORD;
  v_account RECORD;
  v_total_pago NUMERIC;
  v_category_id UUID;
  v_payment_method TEXT;
BEGIN
  -- Buscar dados da venda
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Buscar conta a receber relacionada
  SELECT * INTO v_account
  FROM public.accounts_receivable
  WHERE sale_id = p_sale_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Atualizar valor pago
  UPDATE public.accounts_receivable
  SET 
    valor_pago = v_sale.total_pago,
    status = CASE
      WHEN v_sale.total_pago >= v_sale.total THEN 'pago'
      WHEN v_sale.total_pago > 0 THEN 'parcial'
      ELSE 'pendente'
    END,
    data_pagamento = CASE
      WHEN v_sale.total_pago >= v_sale.total THEN DATE(v_sale.finalized_at)
      ELSE NULL
    END,
    paid_at = CASE
      WHEN v_sale.total_pago >= v_sale.total THEN NOW()
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = v_account.id;
  
  -- Se foi totalmente pago, criar transação financeira para o restante
  IF v_sale.total_pago >= v_sale.total AND v_account.valor_pago < v_sale.total THEN
    -- Buscar categoria
    SELECT forma_pagamento INTO v_payment_method
    FROM public.payments
    WHERE sale_id = p_sale_id
      AND status = 'confirmed'
    ORDER BY valor DESC
    LIMIT 1;
    
    IF v_payment_method IN ('dinheiro', 'pix') THEN
      SELECT id INTO v_category_id
      FROM financial_categories
      WHERE name = 'Vendas à Vista'
      LIMIT 1;
    ELSIF v_payment_method IN ('credito', 'debito', 'cartao_credito', 'cartao_debito') THEN
      SELECT id INTO v_category_id
      FROM financial_categories
      WHERE name = 'Vendas Cartão'
      LIMIT 1;
    END IF;
    
    -- Criar transação para o valor restante
    IF v_category_id IS NOT NULL THEN
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
        'Quitação - Venda #' || v_sale.numero,
        v_sale.total - v_account.valor_pago,
        CASE 
          WHEN v_payment_method = 'dinheiro' THEN 'dinheiro'
          WHEN v_payment_method = 'pix' THEN 'pix'
          WHEN v_payment_method IN ('credito', 'cartao_credito') THEN 'cartao_credito'
          WHEN v_payment_method IN ('debito', 'cartao_debito') THEN 'cartao_debito'
          ELSE 'outro'
        END::payment_method,
        CURRENT_DATE,
        p_sale_id,
        'sale',
        'Quitação de conta a receber',
        v_sale.vendedor_id
      );
    END IF;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao atualizar conta a receber: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. TRIGGER PARA INTEGRAR AUTOMATICAMENTE AO FINALIZAR VENDA
-- ============================================
DROP TRIGGER IF EXISTS trigger_integrate_sale_on_finalize ON public.sales;
CREATE OR REPLACE FUNCTION trigger_integrate_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando venda é finalizada (is_draft = false e finalized_at não é null)
  IF NEW.is_draft = false AND NEW.finalized_at IS NOT NULL AND OLD.is_draft = true THEN
    -- Integrar ao financeiro
    PERFORM integrate_sale_to_financial(NEW.id);
    
    -- Faturar OS se houver
    IF NEW.ordem_servico_id IS NOT NULL THEN
      PERFORM fatura_os_from_sale(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_integrate_sale_on_finalize
  AFTER UPDATE ON public.sales
  FOR EACH ROW
  WHEN (OLD.is_draft = true AND NEW.is_draft = false)
  EXECUTE FUNCTION trigger_integrate_sale();

-- ============================================
-- 9. TRIGGER PARA ATUALIZAR CONTA A RECEBER QUANDO PAGAMENTO É CONFIRMADO
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_accounts_receivable_on_payment ON public.sales;
CREATE OR REPLACE FUNCTION trigger_update_accounts_receivable()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando total_pago muda, atualizar conta a receber
  IF NEW.total_pago != OLD.total_pago AND NEW.financial_integrated = true THEN
    PERFORM update_accounts_receivable_on_payment(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_accounts_receivable_on_payment
  AFTER UPDATE OF total_pago ON public.sales
  FOR EACH ROW
  WHEN (NEW.total_pago != OLD.total_pago)
  EXECUTE FUNCTION trigger_update_accounts_receivable();

-- ============================================
-- 10. RLS PARA CONTAS A RECEBER
-- ============================================
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accounts receivable" ON public.accounts_receivable;
CREATE POLICY "Users can view accounts receivable" ON public.accounts_receivable
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage accounts receivable" ON public.accounts_receivable;
CREATE POLICY "Admin can manage accounts receivable" ON public.accounts_receivable
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 11. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.accounts_receivable IS 'Contas a receber geradas a partir de vendas';
COMMENT ON FUNCTION integrate_sale_to_financial IS 'Integra uma venda ao sistema financeiro, criando transações e contas a receber';
COMMENT ON FUNCTION revert_stock_from_sale IS 'Reverte a baixa de estoque quando uma venda é cancelada';
COMMENT ON FUNCTION fatura_os_from_sale IS 'Marca uma OS como faturada quando uma venda vinculada é finalizada';
COMMENT ON FUNCTION update_accounts_receivable_on_payment IS 'Atualiza conta a receber quando um pagamento é confirmado';

