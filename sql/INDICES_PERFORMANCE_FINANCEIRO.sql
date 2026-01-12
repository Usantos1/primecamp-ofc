-- ============================================
-- ÍNDICES PARA PERFORMANCE - SISTEMA FINANCEIRO
-- ============================================
-- Execute este script para melhorar performance das queries

-- Índices para tabela sales (usada em todas as queries)
CREATE INDEX IF NOT EXISTS idx_sales_created_at_status ON public.sales(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at ON public.sales(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_origin_status ON public.sales(sale_origin, status);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_user_id ON public.sales(cashier_user_id) WHERE cashier_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_technician_id ON public.sales(technician_id) WHERE technician_id IS NOT NULL;

-- Índices para tabela sale_items (usada em análises de produtos)
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_produto_id ON public.sale_items(produto_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_produto ON public.sale_items(sale_id, produto_id);

-- Índices para tabela bills_to_pay (usada no DRE e contas)
CREATE INDEX IF NOT EXISTS idx_bills_to_pay_status ON public.bills_to_pay(status);
CREATE INDEX IF NOT EXISTS idx_bills_to_pay_payment_date ON public.bills_to_pay(payment_date) WHERE payment_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bills_to_pay_due_date ON public.bills_to_pay(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_to_pay_status_payment_date ON public.bills_to_pay(status, payment_date) WHERE payment_date IS NOT NULL;

-- Índices para tabela produtos (usada em análises)
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo) WHERE codigo IS NOT NULL;

-- Comentários
COMMENT ON INDEX idx_sales_created_at_status IS 'Índice para queries de vendas por data e status';
COMMENT ON INDEX idx_sales_status_created_at IS 'Índice para queries filtradas por status';
COMMENT ON INDEX idx_bills_to_pay_status_payment_date IS 'Índice para DRE e relatórios de contas pagas';
