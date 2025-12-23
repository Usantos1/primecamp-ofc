-- ============================================
-- REMOVER CONSTRAINT UNIQUE DO CAMPO NUMERO
-- Permite importar OS com números específicos do sistema antigo
-- ============================================

-- Remover constraint UNIQUE do campo numero
ALTER TABLE public.ordens_servico
DROP CONSTRAINT IF EXISTS ordens_servico_numero_key;

-- Manter o índice para performance (sem UNIQUE)
DROP INDEX IF EXISTS idx_ordens_servico_numero;
CREATE INDEX IF NOT EXISTS idx_ordens_servico_numero ON public.ordens_servico(numero);

