-- Ativa CRM -> AtivaFIX -> Meta Ads
-- Armazena payload bruto, contexto CTWA e deduplicação dos leads recebidos
-- Aplicar na VPS: psql ... -f db/migrations/manual/ATIVA_CRM_WEBHOOK_EVENTS.sql

CREATE TABLE IF NOT EXISTS public.ativa_crm_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  conversation_id TEXT,
  ticket_id TEXT,
  message_id TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  message_text TEXT,
  direction TEXT,
  ctwa_clid TEXT,
  source_url TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  adset_id TEXT,
  ad_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  meta_event_id TEXT,
  meta_status TEXT DEFAULT 'pendente'
    CHECK (meta_status IN ('pendente', 'enviado', 'erro', 'ignorado')),
  meta_error_message TEXT,
  raw_payload JSONB NOT NULL,
  headers JSONB,
  ip_origem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ativa_crm_webhook_events_event_id
  ON public.ativa_crm_webhook_events (company_id, event_id);

CREATE INDEX IF NOT EXISTS idx_ativa_crm_webhook_events_company_created
  ON public.ativa_crm_webhook_events (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ativa_crm_webhook_events_phone
  ON public.ativa_crm_webhook_events (company_id, contact_phone);

CREATE INDEX IF NOT EXISTS idx_ativa_crm_webhook_events_meta_status
  ON public.ativa_crm_webhook_events (company_id, meta_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_ativa_crm_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ativa_crm_webhook_events_updated_at ON public.ativa_crm_webhook_events;
CREATE TRIGGER trg_ativa_crm_webhook_events_updated_at
  BEFORE UPDATE ON public.ativa_crm_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ativa_crm_webhook_events_updated_at();

COMMENT ON TABLE public.ativa_crm_webhook_events IS 'Eventos brutos recebidos do Ativa CRM para formar funil de Lead e CTWA';
COMMENT ON COLUMN public.ativa_crm_webhook_events.raw_payload IS 'Payload original do Ativa CRM para mapeamento posterior de campos CTWA/campanha';
