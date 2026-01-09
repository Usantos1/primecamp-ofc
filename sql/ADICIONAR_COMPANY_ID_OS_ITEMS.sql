-- =====================================================
-- ADICIONAR company_id NA TABELA os_items
-- =====================================================
-- A tabela os_items foi criada sem a coluna company_id,
-- mas o backend requer essa coluna para isolamento de dados.
-- =====================================================

-- 1. Adicionar coluna company_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'os_items'
      AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.os_items ADD COLUMN company_id UUID;
    RAISE NOTICE 'Coluna company_id adicionada à tabela os_items';
  ELSE
    RAISE NOTICE 'Coluna company_id já existe na tabela os_items';
  END IF;
END $$;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_os_items_company_id ON public.os_items(company_id);

-- 3. Atualizar itens existentes com o company_id da OS pai
UPDATE public.os_items AS i
SET company_id = os.company_id
FROM public.ordens_servico AS os
WHERE i.ordem_servico_id = os.id
  AND i.company_id IS NULL
  AND os.company_id IS NOT NULL;

-- 4. Verificar resultado
SELECT 
  COUNT(*) AS total_itens,
  COUNT(company_id) AS itens_com_company_id,
  COUNT(*) - COUNT(company_id) AS itens_sem_company_id
FROM public.os_items;

