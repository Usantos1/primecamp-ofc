-- Isolamento por empresa: Dados da Empresa no cupom (configuração por empresa)
-- Cada empresa vê e edita só seus próprios dados no cupom.
--
-- PGADMIN: Query Tool → abra e execute este arquivo.
-- VPS: cd /root/primecamp-ofc && PGPASSWORD='SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/CUPOM_CONFIG_ADD_company_id.sql
--

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cupom_config' AND column_name = 'company_id') THEN
    ALTER TABLE public.cupom_config ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_cupom_config_company_id ON public.cupom_config(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em cupom_config.';
  END IF;
END $$;

-- Remover índice único que força uma única linha (se existir), para permitir uma linha por empresa
DROP INDEX IF EXISTS public.idx_cupom_config_single;

-- Registo existente sem company_id: vincular à primeira empresa (quem já usa hoje)
UPDATE public.cupom_config
SET company_id = (SELECT id FROM public.companies ORDER BY id LIMIT 1)
WHERE company_id IS NULL;
