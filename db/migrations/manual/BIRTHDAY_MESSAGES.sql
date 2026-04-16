-- Mensagens automáticas de aniversário para clientes
-- Aplicar na VPS: psql ... -f db/migrations/manual/BIRTHDAY_MESSAGES.sql

-- Configuração por empresa
CREATE TABLE IF NOT EXISTS public.birthday_message_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT false,
  horario_envio VARCHAR(5) NOT NULL DEFAULT '09:00',
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  template_mensagem TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT birthday_message_settings_company_unique UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_birthday_message_settings_company
  ON public.birthday_message_settings (company_id);

-- Fila / histórico diário por cliente
CREATE TABLE IF NOT EXISTS public.birthday_message_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefone TEXT,
  mensagem_renderizada TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'agendado'
    CHECK (status IN ('pendente', 'agendado', 'enviado', 'erro', 'cancelado')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  source_date DATE NOT NULL,
  template_key VARCHAR(64) NOT NULL DEFAULT 'birthday-default',
  error_message TEXT,
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um agendamento por cliente por dia/empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_birthday_message_jobs_unique_daily
  ON public.birthday_message_jobs (company_id, cliente_id, source_date);

CREATE INDEX IF NOT EXISTS idx_birthday_message_jobs_due
  ON public.birthday_message_jobs (status, scheduled_at)
  WHERE status IN ('pendente', 'agendado');

CREATE INDEX IF NOT EXISTS idx_birthday_message_jobs_company_created
  ON public.birthday_message_jobs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_birthday_message_jobs_company_source_date
  ON public.birthday_message_jobs (company_id, source_date DESC);

COMMENT ON TABLE public.birthday_message_settings IS 'Configuração por empresa para mensagens automáticas de aniversário';
COMMENT ON TABLE public.birthday_message_jobs IS 'Fila e histórico de mensagens de aniversário por cliente';

SELECT 'Tabelas de mensagens de aniversário criadas com sucesso.' AS resultado;
