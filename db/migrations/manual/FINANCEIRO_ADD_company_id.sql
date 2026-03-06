-- Isolamento por empresa: company_id em financial_transactions, accounts_receivable e financial_categories
-- DRE, Fluxo de Caixa, Contas a Pagar e Transações não podem mostrar dados de outra empresa.
--
-- PGADMIN: Conecte no banco (ex.: banco_gestao) → Query Tool → abra este arquivo → Execute (F5).
-- VPS: cd /root/primecamp-ofc && PGPASSWORD='SUA_SENHA' psql -h localhost -U postgres -d banco_gestao -f /root/primecamp-ofc/db/migrations/manual/FINANCEIRO_ADD_company_id.sql
--

-- 1) financial_categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'financial_categories' AND column_name = 'company_id') THEN
    ALTER TABLE public.financial_categories ADD COLUMN company_id UUID;
    CREATE INDEX IF NOT EXISTS idx_financial_categories_company_id ON public.financial_categories(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em financial_categories.';
  ELSE
    RAISE NOTICE 'Coluna company_id já existe em financial_categories.';
  END IF;
  -- Categorias existentes: vincular à primeira empresa (evita sumir para quem já usa)
  UPDATE public.financial_categories fc
  SET company_id = (SELECT id FROM public.companies ORDER BY id LIMIT 1)
  WHERE fc.company_id IS NULL;
  RAISE NOTICE 'financial_categories: company_id preenchido.';
END $$;

-- 2) financial_transactions (backfill: created_by -> users.company_id; reference bill -> bills_to_pay.company_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'financial_transactions' AND column_name = 'company_id') THEN
    ALTER TABLE public.financial_transactions ADD COLUMN company_id UUID;
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_company_id ON public.financial_transactions(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em financial_transactions.';
  ELSE
    RAISE NOTICE 'Coluna company_id já existe em financial_transactions.';
  END IF;
END $$;
-- Por criador (created_by -> users.company_id)
UPDATE public.financial_transactions ft
SET company_id = u.company_id
FROM public.users u
WHERE u.id = ft.created_by AND ft.company_id IS NULL;
-- Por conta paga (reference_type = 'bill' -> bills_to_pay.company_id)
UPDATE public.financial_transactions ft
SET company_id = b.company_id
FROM public.bills_to_pay b
WHERE ft.reference_type = 'bill' AND b.id = ft.reference_id AND ft.company_id IS NULL;

-- 3) accounts_receivable (backfill por sale_id -> sales.company_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts_receivable' AND column_name = 'company_id') THEN
    ALTER TABLE public.accounts_receivable ADD COLUMN company_id UUID;
    CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company_id ON public.accounts_receivable(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em accounts_receivable.';
  ELSE
    RAISE NOTICE 'Coluna company_id já existe em accounts_receivable.';
  END IF;
END $$;
UPDATE public.accounts_receivable ar
SET company_id = s.company_id
FROM public.sales s
WHERE s.id = ar.sale_id AND ar.company_id IS NULL;
-- Contas a receber sem sale_id (ex.: por OS): usar primeira empresa ou deixar NULL
UPDATE public.accounts_receivable ar
SET company_id = (SELECT id FROM public.companies ORDER BY id LIMIT 1)
WHERE ar.company_id IS NULL AND ar.sale_id IS NULL;
