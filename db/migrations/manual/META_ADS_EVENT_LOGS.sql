-- Meta Ads / Conversions API
-- Aplicar na VPS: psql ... -f db/migrations/manual/META_ADS_EVENT_LOGS.sql

CREATE TABLE IF NOT EXISTS public.meta_ads_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'os_purchase',
  source TEXT NOT NULL DEFAULT 'system',
  sale_id UUID NULL REFERENCES public.sales(id) ON DELETE SET NULL,
  ordem_servico_id UUID NULL REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_ads_event_logs_event_id
  ON public.meta_ads_event_logs (event_id);

CREATE INDEX IF NOT EXISTS idx_meta_ads_event_logs_company_created
  ON public.meta_ads_event_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meta_ads_event_logs_status
  ON public.meta_ads_event_logs (status, last_attempt_at);

CREATE INDEX IF NOT EXISTS idx_meta_ads_event_logs_sale
  ON public.meta_ads_event_logs (sale_id);

CREATE INDEX IF NOT EXISTS idx_meta_ads_event_logs_os
  ON public.meta_ads_event_logs (ordem_servico_id);

CREATE OR REPLACE FUNCTION public.set_meta_ads_event_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meta_ads_event_logs_updated_at ON public.meta_ads_event_logs;
CREATE TRIGGER trg_meta_ads_event_logs_updated_at
  BEFORE UPDATE ON public.meta_ads_event_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_meta_ads_event_logs_updated_at();

COMMENT ON TABLE public.meta_ads_event_logs IS 'Histórico, resposta e deduplicação de eventos enviados para Meta Ads Conversions API';
COMMENT ON COLUMN public.meta_ads_event_logs.event_id IS 'ID idempotente enviado para a Meta; evita conversões duplicadas';
