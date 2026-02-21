-- =====================================================
-- SISTEMA DE MÉTRICAS DE MARKETING E ADS
-- Para rastreamento de campanhas Meta Ads e Google Ads
-- =====================================================

-- Tabela de Campanhas de Ads
CREATE TABLE IF NOT EXISTS public.ads_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    plataforma TEXT NOT NULL, -- 'meta', 'google', 'tiktok', 'outros'
    tipo TEXT NOT NULL, -- 'trafego', 'conversao', 'leads', 'vendas', 'brand'
    status TEXT DEFAULT 'ativa', -- 'ativa', 'pausada', 'encerrada'
    data_inicio DATE NOT NULL,
    data_fim DATE,
    orcamento_diario NUMERIC(12,2),
    orcamento_total NUMERIC(12,2),
    objetivo TEXT, -- Descrição do objetivo da campanha
    url_destino TEXT,
    publico_alvo TEXT, -- Descrição do público
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Métricas Diárias de Ads
CREATE TABLE IF NOT EXISTS public.ads_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    
    -- Métricas de Investimento
    valor_investido NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Métricas de Alcance/Tráfego
    impressoes INTEGER DEFAULT 0,
    alcance INTEGER DEFAULT 0,
    cliques INTEGER DEFAULT 0,
    cliques_link INTEGER DEFAULT 0, -- Cliques no link de destino
    visualizacoes_pagina INTEGER DEFAULT 0,
    
    -- Métricas de Engajamento
    curtidas INTEGER DEFAULT 0,
    comentarios INTEGER DEFAULT 0,
    compartilhamentos INTEGER DEFAULT 0,
    salvos INTEGER DEFAULT 0,
    
    -- Métricas de Leads/Conversão
    leads_gerados INTEGER DEFAULT 0,
    formularios_preenchidos INTEGER DEFAULT 0,
    mensagens_whatsapp INTEGER DEFAULT 0,
    ligacoes INTEGER DEFAULT 0,
    
    -- Métricas de Venda
    vendas_atribuidas INTEGER DEFAULT 0,
    valor_vendas_atribuidas NUMERIC(12,2) DEFAULT 0,
    
    -- Métricas Calculadas (preenchidas pelo sistema)
    cpm NUMERIC(12,4) DEFAULT 0, -- Custo por Mil Impressões
    cpc NUMERIC(12,4) DEFAULT 0, -- Custo por Clique
    cpl NUMERIC(12,4) DEFAULT 0, -- Custo por Lead
    ctr NUMERIC(8,4) DEFAULT 0, -- Click Through Rate (%)
    taxa_conversao NUMERIC(8,4) DEFAULT 0, -- Taxa de Conversão (%)
    roas NUMERIC(8,4) DEFAULT 0, -- Return on Ad Spend
    
    -- Observações
    observacoes TEXT,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id, data)
);

-- Tabela de Leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Origem do Lead
    campaign_id UUID REFERENCES public.ads_campaigns(id) ON DELETE SET NULL,
    fonte TEXT NOT NULL, -- 'meta_ads', 'google_ads', 'organico', 'indicacao', 'site', 'whatsapp', 'outros'
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    
    -- Dados do Lead
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    whatsapp TEXT,
    cidade TEXT,
    estado TEXT,
    
    -- Qualificação
    status TEXT DEFAULT 'novo', -- 'novo', 'contatado', 'qualificado', 'negociacao', 'convertido', 'perdido'
    temperatura TEXT DEFAULT 'frio', -- 'frio', 'morno', 'quente'
    interesse TEXT, -- Produto/serviço de interesse
    orcamento_estimado NUMERIC(12,2),
    prazo_compra TEXT, -- 'imediato', '30_dias', '60_dias', '90_dias', 'indefinido'
    
    -- Atribuição
    responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    responsavel_nome TEXT,
    
    -- Conversão
    convertido BOOLEAN DEFAULT FALSE,
    data_conversao TIMESTAMP WITH TIME ZONE,
    valor_conversao NUMERIC(12,2),
    sale_id UUID, -- ID da venda associada se convertido
    os_id UUID, -- ID da OS associada se convertido
    
    -- Interações
    total_interacoes INTEGER DEFAULT 0,
    ultima_interacao TIMESTAMP WITH TIME ZONE,
    proxima_acao TEXT,
    data_proxima_acao DATE,
    
    -- Observações
    observacoes TEXT,
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Interações com Leads
CREATE TABLE IF NOT EXISTS public.lead_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    
    tipo TEXT NOT NULL, -- 'ligacao', 'whatsapp', 'email', 'visita', 'reuniao', 'proposta', 'follow_up'
    direcao TEXT DEFAULT 'outbound', -- 'inbound', 'outbound'
    resultado TEXT, -- 'positivo', 'negativo', 'neutro', 'nao_atendeu', 'agendado'
    
    descricao TEXT,
    duracao_minutos INTEGER,
    
    realizado_por_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    realizado_por_nome TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Metas de Marketing
CREATE TABLE IF NOT EXISTS public.marketing_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periodo TEXT NOT NULL, -- '2024-01' (YYYY-MM)
    
    -- Metas de Investimento
    meta_investimento NUMERIC(12,2),
    
    -- Metas de Tráfego
    meta_impressoes INTEGER,
    meta_cliques INTEGER,
    meta_alcance INTEGER,
    
    -- Metas de Leads
    meta_leads INTEGER,
    meta_leads_qualificados INTEGER,
    
    -- Metas de Conversão
    meta_conversoes INTEGER,
    meta_valor_vendas NUMERIC(12,2),
    
    -- Metas de Eficiência
    meta_cpl NUMERIC(12,4), -- Custo por Lead máximo
    meta_cpc NUMERIC(12,4), -- Custo por Clique máximo
    meta_roas NUMERIC(8,4), -- ROAS mínimo
    
    observacoes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(periodo)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_plataforma ON public.ads_campaigns(plataforma);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_status ON public.ads_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_data_inicio ON public.ads_campaigns(data_inicio);

CREATE INDEX IF NOT EXISTS idx_ads_metrics_campaign_id ON public.ads_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_metrics_data ON public.ads_metrics(data);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_fonte ON public.leads(fonte);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_responsavel_id ON public.leads(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_convertido ON public.leads(convertido);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_created_at ON public.lead_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_goals_periodo ON public.marketing_goals(periodo);

-- Trigger para calcular métricas automaticamente
CREATE OR REPLACE FUNCTION calculate_ads_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- CPM (Custo por Mil Impressões)
    IF NEW.impressoes > 0 THEN
        NEW.cpm = (NEW.valor_investido / NEW.impressoes) * 1000;
    END IF;
    
    -- CPC (Custo por Clique)
    IF NEW.cliques > 0 THEN
        NEW.cpc = NEW.valor_investido / NEW.cliques;
    END IF;
    
    -- CPL (Custo por Lead)
    IF NEW.leads_gerados > 0 THEN
        NEW.cpl = NEW.valor_investido / NEW.leads_gerados;
    END IF;
    
    -- CTR (Click Through Rate)
    IF NEW.impressoes > 0 THEN
        NEW.ctr = (NEW.cliques::NUMERIC / NEW.impressoes) * 100;
    END IF;
    
    -- Taxa de Conversão
    IF NEW.cliques > 0 THEN
        NEW.taxa_conversao = (NEW.leads_gerados::NUMERIC / NEW.cliques) * 100;
    END IF;
    
    -- ROAS (Return on Ad Spend)
    IF NEW.valor_investido > 0 THEN
        NEW.roas = NEW.valor_vendas_atribuidas / NEW.valor_investido;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_ads_metrics ON public.ads_metrics;
CREATE TRIGGER trigger_calculate_ads_metrics
    BEFORE INSERT OR UPDATE ON public.ads_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_ads_metrics();

-- Trigger para atualizar contador de interações no lead
CREATE OR REPLACE FUNCTION update_lead_interaction_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.leads
    SET 
        total_interacoes = (SELECT COUNT(*) FROM public.lead_interactions WHERE lead_id = NEW.lead_id),
        ultima_interacao = NOW(),
        updated_at = NOW()
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lead_interaction_count ON public.lead_interactions;
CREATE TRIGGER trigger_update_lead_interaction_count
    AFTER INSERT ON public.lead_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_interaction_count();

