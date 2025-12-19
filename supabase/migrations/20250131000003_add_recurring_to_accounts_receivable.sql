-- ============================================
-- ADICIONAR RECORRÊNCIA EM ACCOUNTS_RECEIVABLE
-- ============================================

ALTER TABLE public.accounts_receivable
ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_day INTEGER, -- Dia do mês para receitas recorrentes
ADD COLUMN IF NOT EXISTS parent_receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE SET NULL; -- Referência à conta pai (se for gerada automaticamente)

-- Índice para facilitar busca de contas recorrentes
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_recurring ON public.accounts_receivable(recurring);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_parent ON public.accounts_receivable(parent_receivable_id);

