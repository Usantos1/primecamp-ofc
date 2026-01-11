-- ============================================
-- MIGRAÇÃO: TABELAS PARA SISTEMA IA-FIRST FINANCEIRO
-- ============================================
-- Execute este script no banco de dados
-- ============================================

-- Histórico de vendas para análise (snapshot diário)
CREATE TABLE IF NOT EXISTS public.vendas_snapshot_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  total_pdv NUMERIC(10,2) DEFAULT 0,
  total_os NUMERIC(10,2) DEFAULT 0,
  total_geral NUMERIC(10,2) DEFAULT 0,
  quantidade_vendas_pdv INTEGER DEFAULT 0,
  quantidade_vendas_os INTEGER DEFAULT 0,
  ticket_medio_pdv NUMERIC(10,2) DEFAULT 0,
  ticket_medio_os NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT vendas_snapshot_diario_data_unique UNIQUE(data)
);

CREATE INDEX IF NOT EXISTS idx_vendas_snapshot_diario_data ON public.vendas_snapshot_diario(data DESC);

-- Análise de produtos (agregação mensal)
CREATE TABLE IF NOT EXISTS public.produto_analise_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
  mes DATE NOT NULL, -- Primeiro dia do mês
  quantidade_vendida INTEGER DEFAULT 0,
  receita_total NUMERIC(10,2) DEFAULT 0,
  lucro_total NUMERIC(10,2) DEFAULT 0,
  margem_media NUMERIC(5,2) DEFAULT 0, -- Percentual
  rotatividade NUMERIC(10,2) DEFAULT 0, -- Vezes que girou o estoque
  dias_estoque NUMERIC(5,2) DEFAULT 0, -- Dias médios em estoque
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT produto_analise_mensal_produto_mes_unique UNIQUE(produto_id, mes)
);

CREATE INDEX IF NOT EXISTS idx_produto_analise_mensal_produto ON public.produto_analise_mensal(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_analise_mensal_mes ON public.produto_analise_mensal(mes DESC);

-- Análise de vendedores (agregação mensal)
CREATE TABLE IF NOT EXISTS public.vendedor_analise_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mes DATE NOT NULL, -- Primeiro dia do mês
  vendas_pdv INTEGER DEFAULT 0,
  vendas_os INTEGER DEFAULT 0,
  total_vendido NUMERIC(10,2) DEFAULT 0,
  ticket_medio NUMERIC(10,2) DEFAULT 0,
  comissao_total NUMERIC(10,2) DEFAULT 0,
  conversao_percentual NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT vendedor_analise_mensal_vendedor_mes_unique UNIQUE(vendedor_id, mes)
);

CREATE INDEX IF NOT EXISTS idx_vendedor_analise_mensal_vendedor ON public.vendedor_analise_mensal(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_analise_mensal_mes ON public.vendedor_analise_mensal(mes DESC);

-- Análise de horários/dias (agregação)
CREATE TABLE IF NOT EXISTS public.vendas_analise_temporal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  dia_semana INTEGER NOT NULL, -- 0=Domingo, 1=Segunda, etc
  hora INTEGER NOT NULL, -- 0-23
  total_vendido NUMERIC(10,2) DEFAULT 0,
  quantidade_vendas INTEGER DEFAULT 0,
  ticket_medio NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT vendas_analise_temporal_data_hora_unique UNIQUE(data, hora)
);

CREATE INDEX IF NOT EXISTS idx_vendas_analise_temporal_data ON public.vendas_analise_temporal(data DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_analise_temporal_dia_semana ON public.vendas_analise_temporal(dia_semana);
CREATE INDEX IF NOT EXISTS idx_vendas_analise_temporal_hora ON public.vendas_analise_temporal(hora);

-- Previsões e projeções da IA
CREATE TABLE IF NOT EXISTS public.ia_previsoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL, -- 'vendas', 'produto', 'estoque', 'receita'
  referencia_id UUID, -- ID do produto, vendedor, etc (NULL para geral)
  periodo DATE NOT NULL, -- Data da previsão
  valor_previsto NUMERIC(10,2) DEFAULT 0,
  intervalo_confianca_min NUMERIC(10,2) DEFAULT 0,
  intervalo_confianca_max NUMERIC(10,2) DEFAULT 0,
  confianca_percentual NUMERIC(5,2) DEFAULT 0, -- 0-100
  modelo_usado VARCHAR(100), -- Nome do modelo de IA usado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ia_previsoes_tipo_periodo ON public.ia_previsoes(tipo, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_ia_previsoes_referencia ON public.ia_previsoes(referencia_id);

-- Recomendações da IA
CREATE TABLE IF NOT EXISTS public.ia_recomendacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL, -- 'preco', 'estoque', 'vendedor', 'promocao'
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NOT NULL,
  acao_sugerida TEXT,
  prioridade INTEGER DEFAULT 5, -- 1-10 (10 = crítico)
  impacto_estimado NUMERIC(10,2), -- Impacto financeiro estimado
  status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'aceita', 'rejeitada', 'aplicada'
  aplicada_em TIMESTAMP WITH TIME ZONE,
  aplicada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ia_recomendacoes_status_prioridade ON public.ia_recomendacoes(status, prioridade DESC);
CREATE INDEX IF NOT EXISTS idx_ia_recomendacoes_tipo ON public.ia_recomendacoes(tipo);

-- DRE Mensal/Anual
CREATE TABLE IF NOT EXISTS public.dre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo DATE NOT NULL, -- Primeiro dia do período
  tipo VARCHAR(20) NOT NULL, -- 'mensal', 'anual'
  receita_bruta NUMERIC(10,2) DEFAULT 0,
  deducoes NUMERIC(10,2) DEFAULT 0,
  receita_liquida NUMERIC(10,2) DEFAULT 0,
  custo_produtos_vendidos NUMERIC(10,2) DEFAULT 0,
  lucro_bruto NUMERIC(10,2) DEFAULT 0,
  margem_bruta_percentual NUMERIC(5,2) DEFAULT 0,
  despesas_operacionais NUMERIC(10,2) DEFAULT 0,
  ebitda NUMERIC(10,2) DEFAULT 0,
  resultado_financeiro NUMERIC(10,2) DEFAULT 0,
  lucro_liquido NUMERIC(10,2) DEFAULT 0,
  margem_liquida_percentual NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT dre_periodo_tipo_unique UNIQUE(periodo, tipo)
);

CREATE INDEX IF NOT EXISTS idx_dre_periodo ON public.dre(periodo DESC);
CREATE INDEX IF NOT EXISTS idx_dre_tipo ON public.dre(tipo);

-- Planejamento Anual
CREATE TABLE IF NOT EXISTS public.planejamento_anual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ano INTEGER NOT NULL,
  receita_planejada NUMERIC(10,2) DEFAULT 0,
  receita_prevista_ia NUMERIC(10,2) DEFAULT 0,
  meta_mensal JSONB, -- {1: valor, 2: valor, ...}
  despesas_planejadas NUMERIC(10,2) DEFAULT 0,
  lucro_esperado NUMERIC(10,2) DEFAULT 0,
  margem_esperada NUMERIC(5,2) DEFAULT 0,
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT planejamento_anual_ano_unique UNIQUE(ano)
);

CREATE INDEX IF NOT EXISTS idx_planejamento_anual_ano ON public.planejamento_anual(ano DESC);

-- Comentários para documentação
COMMENT ON TABLE public.vendas_snapshot_diario IS 'Snapshot diário de vendas para análise histórica';
COMMENT ON TABLE public.produto_analise_mensal IS 'Análise mensal agregada por produto';
COMMENT ON TABLE public.vendedor_analise_mensal IS 'Análise mensal agregada por vendedor';
COMMENT ON TABLE public.vendas_analise_temporal IS 'Análise de vendas por hora e dia da semana';
COMMENT ON TABLE public.ia_previsoes IS 'Previsões geradas por modelos de IA';
COMMENT ON TABLE public.ia_recomendacoes IS 'Recomendações geradas pela IA para ações estratégicas';
COMMENT ON TABLE public.dre IS 'Demonstração do Resultado do Exercício (mensal/anual)';
COMMENT ON TABLE public.planejamento_anual IS 'Planejamento financeiro anual com metas e projeções';
