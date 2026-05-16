-- Sistema de multiempresas com unidades/filiais dentro da mesma company_id.
-- Execute este script no banco PostgreSQL antes de habilitar a gestão de filiais no app.
-- Ele é idempotente e preserva dados antigos atribuindo-os à unidade "Matriz".

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'filial' CHECK (type IN ('matriz', 'filial', 'laboratorio', 'deposito')),
  document TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  is_main BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_one_main_per_company
  ON public.branches(company_id)
  WHERE is_main = true;

CREATE INDEX IF NOT EXISTS idx_branches_company_active
  ON public.branches(company_id, is_active);

CREATE TABLE IF NOT EXISTS public.user_branch_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  role TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_branch_one_default_per_company
  ON public.user_branch_access(user_id, company_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_user_branch_access_user_company
  ON public.user_branch_access(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_user_branch_access_branch
  ON public.user_branch_access(branch_id);

CREATE TABLE IF NOT EXISTS public.branch_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_audit_logs_company_created
  ON public.branch_audit_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_branch_audit_logs_branch_created
  ON public.branch_audit_logs(branch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
  minimum_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_product_stocks_company_branch
  ON public.product_stocks(company_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_product_stocks_product
  ON public.product_stocks(product_id);

CREATE OR REPLACE FUNCTION public.update_branch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.update_branch_updated_at();

DROP TRIGGER IF EXISTS trg_user_branch_access_updated_at ON public.user_branch_access;
CREATE TRIGGER trg_user_branch_access_updated_at
BEFORE UPDATE ON public.user_branch_access
FOR EACH ROW EXECUTE FUNCTION public.update_branch_updated_at();

DROP TRIGGER IF EXISTS trg_product_stocks_updated_at ON public.product_stocks;
CREATE TRIGGER trg_product_stocks_updated_at
BEFORE UPDATE ON public.product_stocks
FOR EACH ROW EXECUTE FUNCTION public.update_branch_updated_at();

CREATE OR REPLACE FUNCTION public.branch_slug_from_name(branch_name TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := lower(unaccent(coalesce(branch_name, 'matriz')));
  normalized := regexp_replace(normalized, '[^a-z0-9]+', '-', 'g');
  normalized := regexp_replace(normalized, '(^-|-$)', '', 'g');
  RETURN coalesce(nullif(normalized, ''), 'matriz');
EXCEPTION
  WHEN undefined_function THEN
    normalized := lower(coalesce(branch_name, 'matriz'));
    normalized := regexp_replace(normalized, '[^a-z0-9]+', '-', 'g');
    normalized := regexp_replace(normalized, '(^-|-$)', '', 'g');
    RETURN coalesce(nullif(normalized, ''), 'matriz');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Toda empresa existente passa a ter uma Matriz padrão.
INSERT INTO public.branches (company_id, name, slug, type, is_main, is_active)
SELECT c.id, 'Matriz', 'matriz', 'matriz', true, true
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.branches b WHERE b.company_id = c.id
);

-- Se por algum motivo houver empresa sem unidade principal, marca a primeira unidade como matriz.
WITH first_branch AS (
  SELECT DISTINCT ON (company_id) id, company_id
  FROM public.branches
  ORDER BY company_id, created_at, id
)
UPDATE public.branches b
SET is_main = true,
    type = CASE WHEN b.type = 'matriz' THEN b.type ELSE 'matriz' END
FROM first_branch fb
WHERE b.id = fb.id
  AND NOT EXISTS (
    SELECT 1 FROM public.branches bm
    WHERE bm.company_id = fb.company_id
      AND bm.is_main = true
  );

-- Usuários atuais recebem acesso padrão à Matriz da própria empresa.
INSERT INTO public.user_branch_access (user_id, company_id, branch_id, role, is_default)
SELECT u.id, u.company_id, b.id, p.role, true
FROM public.users u
JOIN public.branches b ON b.company_id = u.company_id AND b.is_main = true
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id, branch_id) DO UPDATE
SET is_default = COALESCE(public.user_branch_access.is_default, EXCLUDED.is_default),
    role = COALESCE(public.user_branch_access.role, EXCLUDED.role),
    updated_at = now();

-- Garante apenas um acesso padrão por usuário/empresa.
WITH ranked_defaults AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, company_id ORDER BY is_default DESC, created_at, id) AS rn
  FROM public.user_branch_access
)
UPDATE public.user_branch_access uba
SET is_default = (rd.rn = 1),
    updated_at = now()
FROM ranked_defaults rd
WHERE rd.id = uba.id;

-- Adiciona branch_id às entidades operacionais quando a tabela existir.
DO $$
DECLARE
  tbl TEXT;
  operational_tables TEXT[] := ARRAY[
    'ordens_servico',
    'sales',
    'vendas',
    'pedidos',
    'cash_register_sessions',
    'cash_movements',
    'caixa_sessions',
    'caixa_movements',
    'payments',
    'os_pagamentos',
    'financial_transactions',
    'accounts_receivable',
    'bills_to_pay',
    'refunds',
    'refund_items',
    'vouchers',
    'voucher_usage',
    'clientes',
    'produto_movimentacoes',
    'sale_items',
    'os_items',
    'quotes'
  ];
BEGIN
  FOREACH tbl IN ARRAY operational_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS branch_id UUID', tbl);

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'company_id'
      ) THEN
        EXECUTE format($sql$
          UPDATE public.%I t
          SET branch_id = b.id
          FROM public.branches b
          WHERE t.branch_id IS NULL
            AND t.company_id = b.company_id
            AND b.is_main = true
        $sql$, tbl);

        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id, branch_id)', 'idx_' || tbl || '_company_branch', tbl);
      ELSE
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(branch_id)', 'idx_' || tbl || '_branch_id', tbl);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = tbl
          AND constraint_name = format('fk_%s_branch', tbl)
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL',
          tbl,
          format('fk_%s_branch', tbl)
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Estoque inicial por Matriz, preservando os campos globais atuais de produtos.
DO $$
DECLARE
  has_quantidade BOOLEAN;
  has_estoque_minimo BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'produtos'
  ) THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'quantidade'
    ) INTO has_quantidade;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'estoque_minimo'
    ) INTO has_estoque_minimo;

    EXECUTE format($sql$
      INSERT INTO public.product_stocks (product_id, company_id, branch_id, quantity, reserved_quantity, minimum_quantity)
      SELECT p.id,
             p.company_id,
             b.id,
             %s,
             0,
             %s
      FROM public.produtos p
      JOIN public.branches b ON b.company_id = p.company_id AND b.is_main = true
      WHERE p.company_id IS NOT NULL
      ON CONFLICT (product_id, branch_id) DO NOTHING
    $sql$,
      CASE WHEN has_quantidade THEN 'COALESCE(p.quantidade, 0)::numeric' ELSE '0' END,
      CASE WHEN has_estoque_minimo THEN 'COALESCE(p.estoque_minimo, 0)::numeric' ELSE '0' END
    );
  END IF;
END $$;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_authenticated_access ON public.branches;
CREATE POLICY branches_authenticated_access
ON public.branches
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS user_branch_access_authenticated_access ON public.user_branch_access;
CREATE POLICY user_branch_access_authenticated_access
ON public.user_branch_access
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS branch_audit_logs_authenticated_access ON public.branch_audit_logs;
CREATE POLICY branch_audit_logs_authenticated_access
ON public.branch_audit_logs
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS product_stocks_authenticated_access ON public.product_stocks;
CREATE POLICY product_stocks_authenticated_access
ON public.product_stocks
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.branches IS 'Unidades/filiais da empresa, sempre dentro da mesma company_id.';
COMMENT ON TABLE public.user_branch_access IS 'Vincula usuários às unidades que podem acessar.';
COMMENT ON TABLE public.product_stocks IS 'Estoque do produto separado por unidade/filial.';
