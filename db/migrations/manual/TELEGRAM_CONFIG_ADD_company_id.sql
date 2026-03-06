-- Isolamento por empresa: Chat IDs do Telegram (Integração Telegram) por empresa
-- Cada empresa configura seus próprios canais/grupos para fotos de entrada/processo/saída da OS.
--
-- PGADMIN: Query Tool → abra e execute este arquivo.
-- VPS: PGPASSWORD='SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/TELEGRAM_CONFIG_ADD_company_id.sql
--

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'telegram_config' AND column_name = 'company_id') THEN
    ALTER TABLE public.telegram_config ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_telegram_config_company_id ON public.telegram_config(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em telegram_config.';
  END IF;
END $$;

-- Remover UNIQUE apenas em key; passar a usar UNIQUE(company_id, key)
ALTER TABLE public.telegram_config DROP CONSTRAINT IF EXISTS telegram_config_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_config_company_key ON public.telegram_config(company_id, key);

-- Registo existente: vincular à primeira empresa
UPDATE public.telegram_config
SET company_id = (SELECT id FROM public.companies ORDER BY id LIMIT 1)
WHERE company_id IS NULL;

-- Opcional: tornar company_id NOT NULL se não houver NULLs (evita falha se não existir companies)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.telegram_config WHERE company_id IS NULL) THEN
    ALTER TABLE public.telegram_config ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;