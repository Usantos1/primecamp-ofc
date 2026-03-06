-- Isolamento por empresa: Carteiras / Contas de origem (/admin/configuracoes/pagamentos)
-- Cada empresa vê e gerencia apenas suas próprias carteiras.
--
-- PGADMIN: Query Tool → abra e execute este arquivo.
-- VPS: PGPASSWORD='SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/WALLETS_ADD_company_id.sql
--

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'company_id') THEN
    ALTER TABLE public.wallets ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_wallets_company_id ON public.wallets(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em wallets.';
  END IF;
END $$;

-- Registos existentes: vincular à primeira empresa (quem já usa hoje)
UPDATE public.wallets
SET company_id = (SELECT id FROM public.companies ORDER BY id LIMIT 1)
WHERE company_id IS NULL;
