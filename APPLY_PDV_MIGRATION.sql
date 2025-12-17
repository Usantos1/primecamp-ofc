-- ============================================
-- MÓDULO PDV (PONTO DE VENDA) COMPLETO
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- ============================================
-- 1. TABELA DE VENDAS (sales)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'partial', 'canceled', 'refunded')),
  
  -- Cliente (opcional - pode ser UUID se existir tabela clientes, ou null)
  cliente_id UUID, -- Referência opcional a clientes (pode ser implementada depois)
  cliente_nome TEXT,
  cliente_cpf_cnpj TEXT,
  cliente_telefone TEXT,
  
  -- Vínculo com OS (opcional - armazenado em localStorage, não no banco)
  ordem_servico_id UUID, -- Referência opcional a OS (pode ser implementada depois)
  
  -- Valores
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Vendedor
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendedor_nome TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Rascunho
  is_draft BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finalized_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  canceled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancel_reason TEXT
);

-- Índices para sales
CREATE INDEX IF NOT EXISTS idx_sales_numero ON public.sales(numero);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_cliente_id ON public.sales(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sales_ordem_servico_id ON public.sales(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_sales_vendedor_id ON public.sales(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_is_draft ON public.sales(is_draft);

-- ============================================
-- 2. TABELA DE ITENS DA VENDA (sale_items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  
  -- Dados do produto (snapshot no momento da venda)
  produto_nome TEXT NOT NULL,
  produto_codigo TEXT,
  produto_codigo_barras TEXT,
  produto_tipo TEXT CHECK (produto_tipo IN ('produto', 'servico')),
  
  -- Quantidade e valores
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Observação por item
  observacao TEXT,
  
  -- Garantia
  garantia_dias INTEGER DEFAULT 0,
  garantia_inicio DATE,
  garantia_fim DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_produto_id ON public.sale_items(produto_id);

-- ============================================
-- 3. TABELA DE PAGAMENTOS (payments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  
  -- Forma de pagamento
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'debito', 'credito', 'link_pagamento', 'carteira_digital', 'fiado')),
  
  -- Valores
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  troco NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Parcelamento (para cartão)
  parcelas INTEGER DEFAULT 1,
  taxa_juros NUMERIC(5,2) DEFAULT 0,
  valor_parcela NUMERIC(12,2),
  bandeira TEXT, -- visa, mastercard, elo, etc
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'canceled', 'refunded')),
  
  -- Repasse (para cartão)
  taxa_cartao NUMERIC(5,2) DEFAULT 0,
  valor_repasse NUMERIC(12,2),
  data_repasse DATE,
  
  -- Link de pagamento
  link_pagamento_url TEXT,
  link_pagamento_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  canceled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  refunded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancel_reason TEXT,
  refund_reason TEXT
);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_forma_pagamento ON public.payments(forma_pagamento);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- ============================================
-- 4. TABELA DE SESSÕES DE CAIXA (cash_register_sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  
  -- Operador
  operador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operador_nome TEXT NOT NULL,
  
  -- Valores
  valor_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_final NUMERIC(12,2),
  valor_esperado NUMERIC(12,2),
  divergencia NUMERIC(12,2),
  divergencia_justificativa TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  
  -- Totais por forma de pagamento (JSONB para flexibilidade)
  totais_forma_pagamento JSONB DEFAULT '{}',
  
  -- Timestamps
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Fechamento
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assinatura_caixa TEXT -- Nome + horário do fechamento
);

-- Índices para cash_register_sessions
CREATE INDEX IF NOT EXISTS idx_cash_sessions_numero ON public.cash_register_sessions(numero);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_operador_id ON public.cash_register_sessions(operador_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_register_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at ON public.cash_register_sessions(opened_at DESC);

-- ============================================
-- 5. TABELA DE MOVIMENTOS DE CAIXA (cash_movements)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.cash_register_sessions(id) ON DELETE CASCADE,
  
  -- Tipo de movimento
  tipo TEXT NOT NULL CHECK (tipo IN ('sangria', 'suprimento')),
  
  -- Valores
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  motivo TEXT,
  
  -- Operador
  operador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operador_nome TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para cash_movements
CREATE INDEX IF NOT EXISTS idx_cash_movements_session_id ON public.cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_tipo ON public.cash_movements(tipo);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON public.cash_movements(created_at DESC);

-- ============================================
-- 6. TABELA DE GARANTIAS (warranties)
-- ============================================
CREATE TABLE IF NOT EXISTS public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE CASCADE,
  ordem_servico_id UUID, -- Referência opcional a OS
  
  -- Produto
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  
  -- Cliente (opcional)
  cliente_id UUID, -- Referência opcional a clientes
  cliente_nome TEXT NOT NULL,
  
  -- Período
  dias_garantia INTEGER NOT NULL DEFAULT 90,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE NOT NULL,
  
  -- Regras
  regras TEXT, -- Ex: "sem cobertura para mau uso"
  
  -- Status
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'vencida', 'cancelada')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para warranties
CREATE INDEX IF NOT EXISTS idx_warranties_sale_id ON public.warranties(sale_id);
CREATE INDEX IF NOT EXISTS idx_warranties_sale_item_id ON public.warranties(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_warranties_cliente_id ON public.warranties(cliente_id);
CREATE INDEX IF NOT EXISTS idx_warranties_data_fim ON public.warranties(data_fim);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON public.warranties(status);

-- ============================================
-- 7. TABELA DE DOCUMENTOS/RECIBOS (documents)
-- ============================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  ordem_servico_id UUID, -- Referência opcional a OS
  warranty_id UUID REFERENCES public.warranties(id) ON DELETE SET NULL,
  
  -- Tipo de documento
  tipo TEXT NOT NULL CHECK (tipo IN ('cupom_nao_fiscal', 'comprovante_pagamento', 'termo_garantia', 'nota_fiscal')),
  formato TEXT NOT NULL CHECK (formato IN ('termica_80mm', 'a4', 'pdf')),
  
  -- Dados do documento
  conteudo_html TEXT, -- Para renderização
  conteudo_pdf BYTEA, -- PDF gerado (opcional)
  qr_code_url TEXT, -- URL do QR code
  qr_code_data TEXT, -- Dados do QR code
  
  -- Envio
  enviado_whatsapp BOOLEAN DEFAULT false,
  whatsapp_enviado_em TIMESTAMP WITH TIME ZONE,
  whatsapp_numero TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para documents
CREATE INDEX IF NOT EXISTS idx_documents_sale_id ON public.documents(sale_id);
CREATE INDEX IF NOT EXISTS idx_documents_tipo ON public.documents(tipo);
CREATE INDEX IF NOT EXISTS idx_documents_formato ON public.documents(formato);

-- ============================================
-- 8. TABELA DE AUDITORIA (audit_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuário
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  user_nome TEXT NOT NULL,
  user_email TEXT,
  
  -- Ação
  acao TEXT NOT NULL, -- 'create', 'update', 'delete', 'cancel', 'refund', etc
  entidade TEXT NOT NULL, -- 'sale', 'payment', 'cash_session', etc
  entidade_id UUID,
  
  -- Dados
  dados_anteriores JSONB,
  dados_novos JSONB,
  descricao TEXT,
  
  -- Contexto
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidade ON public.audit_logs(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_acao ON public.audit_logs(acao);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================
-- 9. SEQUENCES PARA NÚMEROS
-- ============================================
CREATE SEQUENCE IF NOT EXISTS sales_numero_seq START 1;
CREATE SEQUENCE IF NOT EXISTS cash_sessions_numero_seq START 1;

-- Função para gerar número de venda
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT nextval('sales_numero_seq') INTO next_num;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de sessão de caixa
CREATE OR REPLACE FUNCTION generate_cash_session_number()
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT nextval('cash_sessions_numero_seq') INTO next_num;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. TRIGGERS PARA UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em sales
DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger em warranties
DROP TRIGGER IF EXISTS update_warranties_updated_at ON public.warranties;
CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON public.warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. FUNÇÃO PARA CALCULAR TOTAL DA VENDA
-- ============================================
CREATE OR REPLACE FUNCTION calculate_sale_total(p_sale_id UUID)
RETURNS NUMERIC(12,2) AS $$
DECLARE
  v_total NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(valor_total), 0) INTO v_total
  FROM public.sale_items
  WHERE sale_id = p_sale_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. FUNÇÃO PARA CALCULAR TOTAL PAGO
-- ============================================
CREATE OR REPLACE FUNCTION calculate_sale_paid(p_sale_id UUID)
RETURNS NUMERIC(12,2) AS $$
DECLARE
  v_paid NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(valor), 0) INTO v_paid
  FROM public.payments
  WHERE sale_id = p_sale_id
    AND status = 'confirmed';
  
  RETURN v_paid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. FUNÇÃO PARA DECREMENTAR ESTOQUE
-- ============================================
CREATE OR REPLACE FUNCTION decrement_stock(produto_id UUID, quantidade NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  v_estoque_atual NUMERIC;
BEGIN
  -- Verificar se a tabela produtos tem coluna estoque_atual
  -- Se não tiver, esta função retornará true sem fazer nada
  BEGIN
    SELECT estoque_atual INTO v_estoque_atual
    FROM public.produtos
    WHERE id = produto_id;
    
    IF v_estoque_atual IS NOT NULL THEN
      UPDATE public.produtos
      SET estoque_atual = GREATEST(0, v_estoque_atual - quantidade)
      WHERE id = produto_id;
    END IF;
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- Se a coluna não existir, apenas retorna true
      RETURN TRUE;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: usuários autenticados podem ver/inserir/atualizar

-- Sales
CREATE POLICY "Authenticated users can view sales" ON public.sales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sales" ON public.sales FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales" ON public.sales FOR UPDATE USING (auth.role() = 'authenticated');

-- Sale Items
CREATE POLICY "Authenticated users can view sale_items" ON public.sale_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sale_items" ON public.sale_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sale_items" ON public.sale_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sale_items" ON public.sale_items FOR DELETE USING (auth.role() = 'authenticated');

-- Payments
CREATE POLICY "Authenticated users can view payments" ON public.payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert payments" ON public.payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update payments" ON public.payments FOR UPDATE USING (auth.role() = 'authenticated');

-- Cash Register Sessions
CREATE POLICY "Authenticated users can view cash_sessions" ON public.cash_register_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert cash_sessions" ON public.cash_register_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update cash_sessions" ON public.cash_register_sessions FOR UPDATE USING (auth.role() = 'authenticated');

-- Cash Movements
CREATE POLICY "Authenticated users can view cash_movements" ON public.cash_movements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert cash_movements" ON public.cash_movements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Warranties
CREATE POLICY "Authenticated users can view warranties" ON public.warranties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert warranties" ON public.warranties FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update warranties" ON public.warranties FOR UPDATE USING (auth.role() = 'authenticated');

-- Documents
CREATE POLICY "Authenticated users can view documents" ON public.documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert documents" ON public.documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Audit Logs (apenas leitura para usuários comuns)
CREATE POLICY "Authenticated users can view audit_logs" ON public.audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- 15. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE public.sales IS 'Tabela principal de vendas do PDV';
COMMENT ON TABLE public.sale_items IS 'Itens de cada venda';
COMMENT ON TABLE public.payments IS 'Pagamentos das vendas (suporta múltiplos pagamentos)';
COMMENT ON TABLE public.cash_register_sessions IS 'Sessões de abertura/fechamento de caixa';
COMMENT ON TABLE public.cash_movements IS 'Sangrias e suprimentos de caixa';
COMMENT ON TABLE public.warranties IS 'Garantias de produtos vendidos';
COMMENT ON TABLE public.documents IS 'Documentos gerados (cupons, comprovantes, termos)';
COMMENT ON TABLE public.audit_logs IS 'Log de auditoria de todas as ações do sistema';

