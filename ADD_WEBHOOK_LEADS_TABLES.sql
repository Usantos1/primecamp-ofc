-- =====================================================
-- SISTEMA DE WEBHOOK PARA RECEBER LEADS
-- Integração com AtivaCRM e outras fontes
-- =====================================================

-- Criar função de atualização de timestamp (se não existir)
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela de configuração de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    webhook_key TEXT NOT NULL UNIQUE, -- Chave única para identificar o webhook
    fonte_padrao TEXT DEFAULT 'webhook', -- Fonte padrão se não vier no payload
    descricao TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    leads_recebidos INTEGER DEFAULT 0,
    ultimo_lead_em TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'lead_recebido', 'erro', 'teste'
    payload JSONB,
    lead_id UUID,
    erro TEXT,
    ip_origem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar campos de webhook à tabela de leads (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
        ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS webhook_id UUID;
        ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS webhook_nome TEXT;
        ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS raw_payload JSONB;
    END IF;
END
$$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_configs_key ON public.webhook_configs(webhook_key);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON public.webhook_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_webhook_configs_updated_at ON public.webhook_configs;
CREATE TRIGGER set_webhook_configs_updated_at
BEFORE UPDATE ON public.webhook_configs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
