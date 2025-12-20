-- ============================================
-- APLICAR OS + CLIENTES + ITENS (IDEMPOTENTE)
-- Rode no Supabase SQL Editor (em produção)
-- Ordem segura:
-- 1) ordens_servico
-- 2) clientes
-- 3) os_items
-- ============================================

-- 1) ORDEM DE SERVIÇO (se a tabela não existir, rode sua migration completa)
-- IMPORTANTE: aqui apenas valida existência; se não existir, você precisa executar
-- o SQL da migration `supabase/migrations/20250131000004_create_ordens_servico_table.sql`.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ordens_servico'
  ) THEN
    RAISE EXCEPTION 'Tabela public.ordens_servico não existe. Execute primeiro a migration 20250131000004_create_ordens_servico_table.sql.';
  END IF;
END $$;

-- 2) CLIENTES (idempotente)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL DEFAULT 'fisica' CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo')),
  nome TEXT NOT NULL,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  rg TEXT,
  sexo TEXT CHECK (sexo IN ('M', 'F', 'Outro')),
  data_nascimento DATE,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  telefone TEXT,
  telefone2 TEXT,
  email TEXT,
  whatsapp TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes(telefone) WHERE telefone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_situacao ON public.clientes(situacao);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON public.clientes(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trigger_update_clientes_updated_at'
      AND n.nspname = 'public'
      AND c.relname = 'clientes'
  ) THEN
    CREATE TRIGGER trigger_update_clientes_updated_at
      BEFORE UPDATE ON public.clientes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes' AND policyname='Usuários autenticados podem ver clientes') THEN
    CREATE POLICY "Usuários autenticados podem ver clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes' AND policyname='Usuários autenticados podem criar clientes') THEN
    CREATE POLICY "Usuários autenticados podem criar clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes' AND policyname='Usuários autenticados podem atualizar clientes') THEN
    CREATE POLICY "Usuários autenticados podem atualizar clientes" ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes' AND policyname='Usuários autenticados podem deletar clientes') THEN
    CREATE POLICY "Usuários autenticados podem deletar clientes" ON public.clientes FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 3) OS ITEMS (idempotente + FK criada apenas se ordens_servico existir)
CREATE TABLE IF NOT EXISTS public.os_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('peca', 'servico', 'mao_de_obra')),
  descricao TEXT NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_minimo NUMERIC(12,2) DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  garantia INTEGER DEFAULT 0,
  colaborador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  colaborador_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_os_items_ordem_servico_id ON public.os_items(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_items_produto_id ON public.os_items(produto_id);
CREATE INDEX IF NOT EXISTS idx_os_items_tipo ON public.os_items(tipo);

CREATE OR REPLACE FUNCTION update_os_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trigger_update_os_items_updated_at'
      AND n.nspname = 'public'
      AND c.relname = 'os_items'
  ) THEN
    CREATE TRIGGER trigger_update_os_items_updated_at
      BEFORE UPDATE ON public.os_items
      FOR EACH ROW
      EXECUTE FUNCTION update_os_items_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ordens_servico'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema='public'
        AND table_name='os_items'
        AND constraint_name='os_items_ordem_servico_id_fkey'
    ) THEN
      ALTER TABLE public.os_items
        ADD CONSTRAINT os_items_ordem_servico_id_fkey
        FOREIGN KEY (ordem_servico_id) REFERENCES public.ordens_servico(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

ALTER TABLE public.os_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='os_items' AND policyname='Usuários autenticados podem ver itens de OS') THEN
    CREATE POLICY "Usuários autenticados podem ver itens de OS" ON public.os_items FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='os_items' AND policyname='Usuários autenticados podem criar itens de OS') THEN
    CREATE POLICY "Usuários autenticados podem criar itens de OS" ON public.os_items FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='os_items' AND policyname='Usuários autenticados podem atualizar itens de OS') THEN
    CREATE POLICY "Usuários autenticados podem atualizar itens de OS" ON public.os_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='os_items' AND policyname='Usuários autenticados podem deletar itens de OS') THEN
    CREATE POLICY "Usuários autenticados podem deletar itens de OS" ON public.os_items FOR DELETE TO authenticated USING (true);
  END IF;
END $$;


