-- Isolamento por empresa: adicionar company_id em cash_register_sessions e cash_movements
-- Para o Caixa não exibir dados de outra empresa (crítico para multi-tenant).
--
-- VPS (como root, troque SUA_SENHA_POSTGRES pela senha real):
--   cd /root/primecamp-ofc && PGPASSWORD='SUA_SENHA_POSTGRES' psql -h localhost -U postgres -d banco_gestao -f /root/primecamp-ofc/db/migrations/manual/CAIXA_ADD_company_id.sql
--

-- 1) cash_register_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_register_sessions' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.cash_register_sessions ADD COLUMN company_id UUID;
    CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_company_id ON public.cash_register_sessions(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em cash_register_sessions.';
  ELSE
    RAISE NOTICE 'Coluna company_id já existe em cash_register_sessions.';
  END IF;
  -- Sempre preencher NULL pelo operador (roda mesmo quando a coluna já existia)
  UPDATE public.cash_register_sessions s
  SET company_id = u.company_id
  FROM public.users u
  WHERE u.id = s.operador_id AND s.company_id IS NULL;
END $$;

-- 2) cash_movements (herda da sessão)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.cash_movements ADD COLUMN company_id UUID;
    CREATE INDEX IF NOT EXISTS idx_cash_movements_company_id ON public.cash_movements(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em cash_movements.';
  ELSE
    RAISE NOTICE 'Coluna company_id já existe em cash_movements.';
  END IF;
  -- Sempre preencher NULL pela sessão (roda mesmo quando a coluna já existia)
  UPDATE public.cash_movements m
  SET company_id = s.company_id
  FROM public.cash_register_sessions s
  WHERE s.id = m.session_id AND m.company_id IS NULL;
END $$;
