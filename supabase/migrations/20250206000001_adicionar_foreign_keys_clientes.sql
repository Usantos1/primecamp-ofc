-- ============================================
-- ADICIONAR FOREIGN KEYS E ÍNDICES PARA CLIENTES
-- Garantir integridade referencial entre clientes, ordens_servico e sales
-- ============================================

-- 0. Limpar dados órfãos antes de adicionar foreign keys
-- Remover referências a clientes que não existem mais
UPDATE public.ordens_servico
SET cliente_id = NULL
WHERE cliente_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.clientes WHERE id = ordens_servico.cliente_id
);

UPDATE public.sales
SET cliente_id = NULL
WHERE cliente_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.clientes WHERE id = sales.cliente_id
);

-- 1. Adicionar FOREIGN KEY em ordens_servico.cliente_id (se não existir)
DO $$
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'ordens_servico'
    AND constraint_name = 'fk_ordens_servico_cliente_id'
  ) THEN
    -- Adicionar FOREIGN KEY
    ALTER TABLE public.ordens_servico
    ADD CONSTRAINT fk_ordens_servico_cliente_id
    FOREIGN KEY (cliente_id)
    REFERENCES public.clientes(id)
    ON DELETE SET NULL;
    
    COMMENT ON CONSTRAINT fk_ordens_servico_cliente_id ON public.ordens_servico IS 
    'Referência ao cliente da ordem de serviço';
  END IF;
END $$;

-- 2. Adicionar FOREIGN KEY em sales.cliente_id (se não existir)
DO $$
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'sales'
    AND constraint_name = 'fk_sales_cliente_id'
  ) THEN
    -- Adicionar FOREIGN KEY
    ALTER TABLE public.sales
    ADD CONSTRAINT fk_sales_cliente_id
    FOREIGN KEY (cliente_id)
    REFERENCES public.clientes(id)
    ON DELETE SET NULL;
    
    COMMENT ON CONSTRAINT fk_sales_cliente_id ON public.sales IS 
    'Referência ao cliente da venda';
  END IF;
END $$;

-- 3. Garantir que os índices existem para melhor performance nas queries
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente_id ON public.ordens_servico(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_cliente_id ON public.sales(cliente_id) WHERE cliente_id IS NOT NULL;

-- Comentários nos índices
COMMENT ON INDEX idx_ordens_servico_cliente_id IS 'Índice para busca rápida de OSs por cliente';
COMMENT ON INDEX idx_sales_cliente_id IS 'Índice para busca rápida de vendas por cliente';

