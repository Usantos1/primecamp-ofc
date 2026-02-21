-- Adicionar campo cash_register_session_id na tabela sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cash_register_session_id UUID REFERENCES public.cash_register_sessions(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_sales_cash_register_session_id ON public.sales(cash_register_session_id);

