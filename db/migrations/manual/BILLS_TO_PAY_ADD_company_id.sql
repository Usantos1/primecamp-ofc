-- Isolamento por empresa: adicionar company_id em bills_to_pay
-- DRE e despesas fixas (contas a pagar) não podem mostrar dados de outra empresa.
--
-- COMO RODAR NO PGADMIN:
-- 1. Conecte no servidor (banco que a API usa, ex.: banco_gestao).
-- 2. Clique com o botão direito no banco → Query Tool (ou Ferramenta de Consulta).
-- 3. Abra este arquivo: File → Open → escolha BILLS_TO_PAY_ADD_company_id.sql
--    OU copie e cole todo o conteúdo abaixo (a partir do primeiro DO $$) na aba SQL.
-- 4. Clique no ícone de Executar (play) ou pressione F5.
-- 5. Veja em Messages: NOTICE da coluna e do preenchimento.
--
-- VPS (como root, troque SUA_SENHA_POSTGRES pela senha real):
--   cd /root/primecamp-ofc && PGPASSWORD='SUA_SENHA_POSTGRES' psql -h localhost -U postgres -d banco_gestao -f /root/primecamp-ofc/db/migrations/manual/BILLS_TO_PAY_ADD_company_id.sql
--

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bills_to_pay' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.bills_to_pay ADD COLUMN company_id UUID;
    CREATE INDEX IF NOT EXISTS idx_bills_to_pay_company_id ON public.bills_to_pay(company_id);
    RAISE NOTICE 'Coluna company_id adicionada em bills_to_pay.';
  ELSE
    RAISE NOTICE 'Coluna company_id já existe em bills_to_pay.';
  END IF;
END $$;

-- Preencher company_id a partir do usuário que criou (created_by -> users.company_id)
-- Se a tabela tiver created_by referenciando users(id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bills_to_pay' AND column_name = 'created_by'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bills_to_pay' AND column_name = 'company_id'
  ) THEN
    UPDATE public.bills_to_pay b
    SET company_id = u.company_id
    FROM public.users u
    WHERE u.id = b.created_by AND b.company_id IS NULL;
    RAISE NOTICE 'bills_to_pay: company_id preenchido a partir de created_by.';
  END IF;
END $$;

-- Contas sem created_by ou com usuário sem company_id ficam com company_id NULL
-- e não aparecerão para nenhuma empresa (evita vazamento entre empresas).
