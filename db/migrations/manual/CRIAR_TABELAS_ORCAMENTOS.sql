-- ============================================
-- CRIAR TABELAS DE ORÇAMENTOS
-- Execute este SQL no banco PostgreSQL
-- ============================================

-- Tabela principal de orçamentos
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'aprovado', 'convertido', 'expirado', 'cancelado')),
  
  -- Cliente
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_cpf_cnpj TEXT,
  cliente_telefone TEXT,
  
  -- Valores
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  desconto_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Vendedor
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendedor_nome TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Validade
  validade_dias INTEGER DEFAULT 7,
  data_validade TIMESTAMP WITH TIME ZONE,
  
  -- Conversão para venda
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Envio WhatsApp
  enviado_whatsapp BOOLEAN DEFAULT FALSE,
  whatsapp_enviado_em TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para quotes
CREATE INDEX IF NOT EXISTS idx_quotes_numero ON public.quotes(numero);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_cliente_id ON public.quotes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_quotes_vendedor_id ON public.quotes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);

-- Tabela de itens do orçamento
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  
  -- Produto
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  produto_codigo TEXT,
  produto_codigo_barras TEXT,
  produto_tipo TEXT CHECK (produto_tipo IN ('produto', 'servico')),
  
  -- Valores
  quantidade NUMERIC(15,4) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(15,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Observação
  observacao TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para quote_items
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_produto_id ON public.quote_items(produto_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quotes_updated_at ON public.quotes;
CREATE TRIGGER trigger_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();

-- Comentários nas tabelas
COMMENT ON TABLE public.quotes IS 'Tabela de orçamentos - não afeta estoque nem caixa';
COMMENT ON TABLE public.quote_items IS 'Itens dos orçamentos';
COMMENT ON COLUMN public.quotes.status IS 'pendente, enviado, aprovado, convertido, expirado, cancelado';
COMMENT ON COLUMN public.quotes.sale_id IS 'ID da venda quando o orçamento é convertido';

-- Verificar criação
SELECT 'Tabela quotes criada com sucesso!' AS resultado;
SELECT COUNT(*) AS total_orcamentos FROM public.quotes;

