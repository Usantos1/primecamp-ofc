-- Follow-up automático pós-venda (WhatsApp) após OS faturada
-- Aplicar na VPS: psql ... -f db/migrations/manual/OS_FOLLOWUP_POS_VENDA.sql

-- Configuração por empresa
CREATE TABLE IF NOT EXISTS public.os_pos_venda_followup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ativo                 BOOLEAN NOT NULL DEFAULT true,
  tipo_regra_envio      VARCHAR(32) NOT NULL DEFAULT 'NEXT_DAY_10AM'
    CHECK (tipo_regra_envio IN ('NEXT_DAY_10AM', 'AFTER_24H')),
  timezone              VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  template_key          VARCHAR(64) NOT NULL DEFAULT 'default',
  template_mensagem     TEXT NOT NULL DEFAULT '',
  solicitar_avaliacao_google BOOLEAN NOT NULL DEFAULT true,
  texto_avaliacao_google TEXT NOT NULL DEFAULT 'Se puder, sua avaliação no Google ajuda muito nossa empresa.',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT os_pos_venda_followup_settings_company_unique UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_os_pos_venda_followup_settings_company
  ON public.os_pos_venda_followup_settings (company_id);

-- Fila / histórico de envios
CREATE TABLE IF NOT EXISTS public.os_pos_venda_followup_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ordem_servico_id      UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  cliente_id            UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefone              TEXT,
  mensagem_renderizada  TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'agendado'
    CHECK (status IN ('pendente', 'agendado', 'enviado', 'erro', 'cancelado')),
  tipo_regra_envio      VARCHAR(32) NOT NULL
    CHECK (tipo_regra_envio IN ('NEXT_DAY_10AM', 'AFTER_24H')),
  scheduled_at          TIMESTAMPTZ NOT NULL,
  sent_at               TIMESTAMPTZ,
  faturado_at           TIMESTAMPTZ NOT NULL,
  error_message         TEXT,
  skip_reason           TEXT,
  random_delay_seconds  INTEGER NOT NULL DEFAULT 0,
  template_key          VARCHAR(64) NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uma única linha de follow-up pós-venda por OS (idempotência)
CREATE UNIQUE INDEX IF NOT EXISTS idx_os_pos_venda_followup_jobs_os_unique
  ON public.os_pos_venda_followup_jobs (ordem_servico_id);

CREATE INDEX IF NOT EXISTS idx_os_pos_venda_followup_jobs_due
  ON public.os_pos_venda_followup_jobs (status, scheduled_at)
  WHERE status IN ('pendente', 'agendado');

CREATE INDEX IF NOT EXISTS idx_os_pos_venda_followup_jobs_company_created
  ON public.os_pos_venda_followup_jobs (company_id, created_at DESC);

COMMENT ON TABLE public.os_pos_venda_followup_settings IS 'Configuração de follow-up WhatsApp pós-faturamento de OS';
COMMENT ON TABLE public.os_pos_venda_followup_jobs IS 'Agendamentos e histórico de follow-up pós-venda por OS';

-- Cancelar follow-up pendente quando a OS for cancelada
CREATE OR REPLACE FUNCTION public.trg_cancel_os_pos_venda_followup_on_os_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (
       (NEW.situacao IS NOT DISTINCT FROM 'cancelada'::text)
       OR (NEW.status IS NOT DISTINCT FROM 'cancelada'::text)
     )
     AND NOT (
       (OLD.situacao IS NOT DISTINCT FROM 'cancelada'::text)
       OR (OLD.status IS NOT DISTINCT FROM 'cancelada'::text)
     )
  THEN
    UPDATE public.os_pos_venda_followup_jobs j
    SET status = 'cancelado',
        updated_at = now(),
        skip_reason = COALESCE(j.skip_reason, 'OS cancelada')
    WHERE j.ordem_servico_id = NEW.id
      AND j.status IN ('pendente', 'agendado');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ordens_servico_cancel_followup ON public.ordens_servico;
CREATE TRIGGER trg_ordens_servico_cancel_followup
  AFTER UPDATE OF situacao, status ON public.ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cancel_os_pos_venda_followup_on_os_cancel();
