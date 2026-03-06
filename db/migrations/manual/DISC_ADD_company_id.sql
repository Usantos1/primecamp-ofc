-- Isolamento por empresa: DISC (/admin/disc) — resultados só da própria empresa
-- disc_responses ganha company_id; backfill por user_id -> users.company_id.
--
-- PGADMIN: Query Tool → abra e execute este arquivo.
-- VPS: cd /root/primecamp-ofc && PGPASSWORD='SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/DISC_ADD_company_id.sql
--

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'disc_responses' AND column_name = 'company_id') THEN
    ALTER TABLE public.disc_responses ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_disc_responses_company_id ON public.disc_responses(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em disc_responses.';
  END IF;
END $$;

UPDATE public.disc_responses dr
SET company_id = u.company_id
FROM public.users u
WHERE u.id = dr.user_id AND dr.company_id IS NULL;
