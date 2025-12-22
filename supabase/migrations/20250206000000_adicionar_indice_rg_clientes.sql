-- ============================================
-- ADICIONAR ÍNDICE PARA CAMPO RG EM CLIENTES
-- E GARANTIR QUE O CAMPO EXISTA
-- ============================================

-- Garantir que o campo RG existe (caso a migration anterior não tenha sido aplicada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'clientes'
    AND column_name = 'rg'
  ) THEN
    ALTER TABLE public.clientes
    ADD COLUMN rg TEXT;
    
    COMMENT ON COLUMN public.clientes.rg IS 'Registro Geral (RG) - opcional, usado quando CPF não está disponível';
  END IF;
END $$;

-- Criar índice para busca por RG (apenas para valores não nulos)
CREATE INDEX IF NOT EXISTS idx_clientes_rg ON public.clientes(rg) WHERE rg IS NOT NULL;

-- Comentário no índice
COMMENT ON INDEX idx_clientes_rg IS 'Índice para busca rápida por RG em clientes';

