-- Isolamento por empresa: api_tokens deve ter company_id
-- Listar/criar/editar tokens só da própria empresa; API pública (/api/v1/*) só retorna dados da empresa do token.
--
-- PGADMIN: Query Tool → abra e execute este arquivo.
-- VPS: cd /root/primecamp-ofc && PGPASSWORD='SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/API_TOKENS_ADD_company_id.sql
--

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_tokens' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.api_tokens ADD COLUMN company_id UUID REFERENCES public.companies(id);
    CREATE INDEX IF NOT EXISTS idx_api_tokens_company_id ON public.api_tokens(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em api_tokens.';
  ELSE
    RAISE NOTICE 'Coluna company_id já existe em api_tokens.';
  END IF;
END $$;

-- Preencher a partir do usuário que criou o token
UPDATE public.api_tokens t
SET company_id = u.company_id
FROM public.users u
WHERE u.id = t.criado_por AND t.company_id IS NULL;
