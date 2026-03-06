-- Isolamento por empresa: Logs do sistema (/admin/logs) só da própria empresa
-- user_activity_logs e audit_logs ganham company_id; backfill por user_id -> users.company_id.
--
-- PGADMIN: Query Tool → abra e execute este arquivo.
-- VPS: cd /root/primecamp-ofc && PGPASSWORD='SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/LOGS_ADD_company_id.sql
--

-- 1) user_activity_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_activity_logs' AND column_name = 'company_id') THEN
    ALTER TABLE public.user_activity_logs ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_logs_company_id ON public.user_activity_logs(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em user_activity_logs.';
  END IF;
END $$;
UPDATE public.user_activity_logs ua
SET company_id = u.company_id
FROM public.users u
WHERE u.id = ua.user_id AND ua.company_id IS NULL;

-- 2) audit_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'company_id') THEN
    ALTER TABLE public.audit_logs ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em audit_logs.';
  END IF;
END $$;
UPDATE public.audit_logs al
SET company_id = u.company_id
FROM public.users u
WHERE u.id = al.user_id AND al.company_id IS NULL;
