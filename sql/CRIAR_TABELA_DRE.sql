-- ============================================
-- CRIAR TABELA DRE (Demonstrativo do Resultado do Exercício)
-- ============================================

-- Criar tabela DRE se não existir
CREATE TABLE IF NOT EXISTS public.dre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo DATE NOT NULL, -- Primeiro dia do período
  tipo VARCHAR(20) NOT NULL, -- 'mensal', 'anual'
  receita_bruta NUMERIC(15,2) DEFAULT 0,
  deducoes NUMERIC(15,2) DEFAULT 0,
  receita_liquida NUMERIC(15,2) DEFAULT 0,
  custo_produtos_vendidos NUMERIC(15,2) DEFAULT 0,
  lucro_bruto NUMERIC(15,2) DEFAULT 0,
  margem_bruta_percentual NUMERIC(5,2) DEFAULT 0,
  despesas_operacionais NUMERIC(15,2) DEFAULT 0,
  ebitda NUMERIC(15,2) DEFAULT 0,
  resultado_financeiro NUMERIC(15,2) DEFAULT 0,
  lucro_liquido NUMERIC(15,2) DEFAULT 0,
  margem_liquida_percentual NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT dre_periodo_tipo_unique UNIQUE(periodo, tipo)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_dre_periodo ON public.dre(periodo DESC);
CREATE INDEX IF NOT EXISTS idx_dre_tipo ON public.dre(tipo);

-- Comentários
COMMENT ON TABLE public.dre IS 'Demonstração do Resultado do Exercício (mensal/anual)';
COMMENT ON COLUMN public.dre.periodo IS 'Primeiro dia do período (ex: primeiro dia do mês para DRE mensal)';
COMMENT ON COLUMN public.dre.tipo IS 'Tipo de DRE: mensal ou anual';
