-- Google Ads / Offline Conversions
-- Aplicar na VPS: psql ... -f db/migrations/manual/GOOGLE_ADS_EVENT_LOGS.sql

CREATE TABLE IF NOT EXISTS public.google_ads_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'conversion',
  source TEXT NOT NULL DEFAULT 'system',
  sale_id UUID NULL REFERENCES public.sales(id) ON DELETE SET NULL,
  ordem_servico_id UUID NULL REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  ativa_crm_event_id UUID NULL REFERENCES public.ativa_crm_webhook_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'enviando', 'enviado', 'erro', 'ignorado')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_ads_event_logs_event_id
  ON public.google_ads_event_logs (event_id);

CREATE INDEX IF NOT EXISTS idx_google_ads_event_logs_company_created
  ON public.google_ads_event_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_google_ads_event_logs_status
  ON public.google_ads_event_logs (status, last_attempt_at);

CREATE INDEX IF NOT EXISTS idx_google_ads_event_logs_sale
  ON public.google_ads_event_logs (sale_id);

CREATE INDEX IF NOT EXISTS idx_google_ads_event_logs_os
  ON public.google_ads_event_logs (ordem_servico_id);

CREATE INDEX IF NOT EXISTS idx_google_ads_event_logs_ativa_crm
  ON public.google_ads_event_logs (ativa_crm_event_id);

CREATE OR REPLACE FUNCTION public.set_google_ads_event_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_google_ads_event_logs_updated_at ON public.google_ads_event_logs;
CREATE TRIGGER trg_google_ads_event_logs_updated_at
  BEFORE UPDATE ON public.google_ads_event_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_google_ads_event_logs_updated_at();

COMMENT ON TABLE public.google_ads_event_logs IS 'Histórico, resposta e deduplicação de conversões enviadas para Google Ads';
COMMENT ON COLUMN public.google_ads_event_logs.event_id IS 'ID idempotente local para evitar conversões duplicadas';
