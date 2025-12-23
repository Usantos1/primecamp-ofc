-- ============================================
-- ATUALIZAR RLS POLICIES PARA USAR has_permission
-- ============================================

-- ============================================
-- 1. SALES (VENDAS)
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;

-- Criar novas policies usando has_permission
CREATE POLICY "Usuários com permissão podem ver vendas"
  ON public.sales
  FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'vendas', 'view'));

CREATE POLICY "Usuários com permissão podem criar vendas"
  ON public.sales
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'vendas', 'create'));

CREATE POLICY "Usuários com permissão podem atualizar vendas"
  ON public.sales
  FOR UPDATE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'vendas', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'vendas', 'edit'));

CREATE POLICY "Usuários com permissão podem deletar vendas"
  ON public.sales
  FOR DELETE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'vendas', 'delete'));

-- ============================================
-- 2. SALE_ITEMS (ITENS DE VENDA)
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated users can view sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can delete sale_items" ON public.sale_items;

-- Criar novas policies
CREATE POLICY "Usuários com permissão podem ver itens de venda"
  ON public.sale_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'view')
    )
  );

CREATE POLICY "Usuários com permissão podem criar itens de venda"
  ON public.sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'create')
    )
  );

CREATE POLICY "Usuários com permissão podem atualizar itens de venda"
  ON public.sale_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'edit')
    )
  );

CREATE POLICY "Usuários com permissão podem deletar itens de venda"
  ON public.sale_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'delete')
    )
  );

-- ============================================
-- 3. PAYMENTS (PAGAMENTOS)
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;

-- Criar novas policies
CREATE POLICY "Usuários com permissão podem ver pagamentos"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = payments.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'view')
    )
  );

CREATE POLICY "Usuários com permissão podem criar pagamentos"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = payments.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'create')
    )
  );

CREATE POLICY "Usuários com permissão podem atualizar pagamentos"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = payments.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = payments.sale_id
        AND public.has_permission(auth.uid(), 'vendas', 'edit')
    )
  );

-- ============================================
-- 4. CASH_REGISTER_SESSIONS (SESSÕES DE CAIXA)
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated users can view cash_sessions" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Authenticated users can insert cash_sessions" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Authenticated users can update cash_sessions" ON public.cash_register_sessions;

-- Criar novas policies
CREATE POLICY "Usuários com permissão podem ver sessões de caixa"
  ON public.cash_register_sessions
  FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'caixa', 'view'));

CREATE POLICY "Usuários com permissão podem abrir caixa"
  ON public.cash_register_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'caixa', 'open'));

CREATE POLICY "Usuários com permissão podem fechar caixa"
  ON public.cash_register_sessions
  FOR UPDATE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'caixa', 'close'))
  WITH CHECK (public.has_permission(auth.uid(), 'caixa', 'close'));

-- ============================================
-- 5. CASH_MOVEMENTS (MOVIMENTOS DE CAIXA)
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated users can view cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Authenticated users can insert cash_movements" ON public.cash_movements;

-- Criar novas policies
CREATE POLICY "Usuários com permissão podem ver movimentos de caixa"
  ON public.cash_movements
  FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'caixa', 'view'));

CREATE POLICY "Usuários com permissão podem criar movimentos de caixa"
  ON public.cash_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'caixa', 'manage'));

-- ============================================
-- 6. ORDENS_SERVICO (ORDENS DE SERVIÇO)
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver ordens de serviço" ON public.ordens_servico;
DROP POLICY IF EXISTS "Usuários autenticados podem criar ordens de serviço" ON public.ordens_servico;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar ordens de serviço" ON public.ordens_servico;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar ordens de serviço" ON public.ordens_servico;

-- Criar novas policies
CREATE POLICY "Usuários com permissão podem ver ordens de serviço"
  ON public.ordens_servico
  FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'os', 'view'));

CREATE POLICY "Usuários com permissão podem criar ordens de serviço"
  ON public.ordens_servico
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'os', 'create'));

CREATE POLICY "Usuários com permissão podem atualizar ordens de serviço"
  ON public.ordens_servico
  FOR UPDATE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'os', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'os', 'edit'));

CREATE POLICY "Usuários com permissão podem deletar ordens de serviço"
  ON public.ordens_servico
  FOR DELETE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'os', 'delete'));

-- ============================================
-- 7. OS_ITEMS (ITENS DE ORDEM DE SERVIÇO)
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver itens de OS" ON public.os_items;
DROP POLICY IF EXISTS "Usuários autenticados podem criar itens de OS" ON public.os_items;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar itens de OS" ON public.os_items;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar itens de OS" ON public.os_items;

-- Criar novas policies
CREATE POLICY "Usuários com permissão podem ver itens de OS"
  ON public.os_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os
      WHERE os.id = os_items.ordem_servico_id
        AND public.has_permission(auth.uid(), 'os', 'view')
    )
  );

CREATE POLICY "Usuários com permissão podem criar itens de OS"
  ON public.os_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os
      WHERE os.id = os_items.ordem_servico_id
        AND public.has_permission(auth.uid(), 'os', 'create')
    )
  );

CREATE POLICY "Usuários com permissão podem atualizar itens de OS"
  ON public.os_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os
      WHERE os.id = os_items.ordem_servico_id
        AND public.has_permission(auth.uid(), 'os', 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os
      WHERE os.id = os_items.ordem_servico_id
        AND public.has_permission(auth.uid(), 'os', 'edit')
    )
  );

CREATE POLICY "Usuários com permissão podem deletar itens de OS"
  ON public.os_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os
      WHERE os.id = os_items.ordem_servico_id
        AND public.has_permission(auth.uid(), 'os', 'delete')
    )
  );

-- ============================================
-- 8. CLIENTES
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem criar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar clientes" ON public.clientes;

-- Criar novas policies
CREATE POLICY "Usuários com permissão podem ver clientes"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'clientes', 'view'));

CREATE POLICY "Usuários com permissão podem criar clientes"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'clientes', 'create'));

CREATE POLICY "Usuários com permissão podem atualizar clientes"
  ON public.clientes
  FOR UPDATE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'clientes', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'clientes', 'edit'));

CREATE POLICY "Usuários com permissão podem deletar clientes"
  ON public.clientes
  FOR DELETE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'clientes', 'delete'));

-- ============================================
-- 9. PRODUTOS (se a tabela existir)
-- ============================================

-- Verificar se a tabela produtos existe e tem RLS habilitado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    -- Habilitar RLS se ainda não estiver habilitado
    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

    -- Remover policies antigas (se existirem)
    DROP POLICY IF EXISTS "Usuários autenticados podem ver produtos" ON public.produtos;
    DROP POLICY IF EXISTS "Usuários autenticados podem criar produtos" ON public.produtos;
    DROP POLICY IF EXISTS "Usuários autenticados podem atualizar produtos" ON public.produtos;
    DROP POLICY IF EXISTS "Usuários autenticados podem deletar produtos" ON public.produtos;

    -- Criar novas policies
    CREATE POLICY "Usuários com permissão podem ver produtos"
      ON public.produtos
      FOR SELECT
      TO authenticated
      USING (public.has_permission(auth.uid(), 'produtos', 'view'));

    CREATE POLICY "Usuários com permissão podem criar produtos"
      ON public.produtos
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_permission(auth.uid(), 'produtos', 'create'));

    CREATE POLICY "Usuários com permissão podem atualizar produtos"
      ON public.produtos
      FOR UPDATE
      TO authenticated
      USING (public.has_permission(auth.uid(), 'produtos', 'edit'))
      WITH CHECK (public.has_permission(auth.uid(), 'produtos', 'edit'));

    CREATE POLICY "Usuários com permissão podem deletar produtos"
      ON public.produtos
      FOR DELETE
      TO authenticated
      USING (public.has_permission(auth.uid(), 'produtos', 'delete'));
  END IF;
END $$;

-- ============================================
-- 10. COMENTÁRIOS
-- ============================================

COMMENT ON POLICY "Usuários com permissão podem ver vendas" ON public.sales IS 'Permite visualizar vendas se o usuário tem permissão vendas.view';
COMMENT ON POLICY "Usuários com permissão podem criar vendas" ON public.sales IS 'Permite criar vendas se o usuário tem permissão vendas.create';
COMMENT ON POLICY "Usuários com permissão podem atualizar vendas" ON public.sales IS 'Permite atualizar vendas se o usuário tem permissão vendas.edit';
COMMENT ON POLICY "Usuários com permissão podem deletar vendas" ON public.sales IS 'Permite deletar vendas se o usuário tem permissão vendas.delete';

COMMENT ON POLICY "Usuários com permissão podem ver ordens de serviço" ON public.ordens_servico IS 'Permite visualizar OS se o usuário tem permissão os.view';
COMMENT ON POLICY "Usuários com permissão podem criar ordens de serviço" ON public.ordens_servico IS 'Permite criar OS se o usuário tem permissão os.create';
COMMENT ON POLICY "Usuários com permissão podem atualizar ordens de serviço" ON public.ordens_servico IS 'Permite atualizar OS se o usuário tem permissão os.edit';
COMMENT ON POLICY "Usuários com permissão podem deletar ordens de serviço" ON public.ordens_servico IS 'Permite deletar OS se o usuário tem permissão os.delete';

COMMENT ON POLICY "Usuários com permissão podem ver clientes" ON public.clientes IS 'Permite visualizar clientes se o usuário tem permissão clientes.view';
COMMENT ON POLICY "Usuários com permissão podem criar clientes" ON public.clientes IS 'Permite criar clientes se o usuário tem permissão clientes.create';
COMMENT ON POLICY "Usuários com permissão podem atualizar clientes" ON public.clientes IS 'Permite atualizar clientes se o usuário tem permissão clientes.edit';
COMMENT ON POLICY "Usuários com permissão podem deletar clientes" ON public.clientes IS 'Permite deletar clientes se o usuário tem permissão clientes.delete';

