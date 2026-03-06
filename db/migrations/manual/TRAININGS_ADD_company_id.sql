-- Isolamento por empresa: Academy / Treinamentos (/treinamentos)
-- Cada empresa vê e gerencia apenas seus próprios treinamentos e atribuições.
--
-- PGADMIN: Query Tool → abra e execute este arquivo.
-- VPS: PGPASSWORD='SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/TRAININGS_ADD_company_id.sql
--

-- 1) trainings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trainings' AND column_name = 'company_id') THEN
    ALTER TABLE public.trainings ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_trainings_company_id ON public.trainings(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em trainings.';
  END IF;
END $$;

UPDATE public.trainings t
SET company_id = u.company_id
FROM public.users u
WHERE u.id = t.created_by AND t.company_id IS NULL;

-- Registo sem created_by: vincular à primeira empresa
UPDATE public.trainings
SET company_id = (SELECT id FROM public.companies ORDER BY id LIMIT 1)
WHERE company_id IS NULL;

-- 2) training_assignments (por training_id -> trainings.company_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_assignments' AND column_name = 'company_id') THEN
    ALTER TABLE public.training_assignments ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_training_assignments_company_id ON public.training_assignments(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em training_assignments.';
  END IF;
END $$;

UPDATE public.training_assignments ta
SET company_id = t.company_id
FROM public.trainings t
WHERE t.id = ta.training_id AND ta.company_id IS NULL;

UPDATE public.training_assignments
SET company_id = (SELECT id FROM public.companies ORDER BY id LIMIT 1)
WHERE company_id IS NULL;
