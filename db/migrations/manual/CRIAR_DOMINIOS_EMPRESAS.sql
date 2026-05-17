-- Sistema de domínios personalizados por empresa
-- Execute no banco principal. Script idempotente.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.company_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'pending',
  verification_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  verification_method TEXT NOT NULL DEFAULT 'cname',
  cname_target TEXT NOT NULL DEFAULT 'custom.ativafix.com',
  txt_record_name TEXT,
  txt_record_value TEXT,
  ssl_status TEXT NOT NULL DEFAULT 'pending',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_domains_type_check CHECK (type IN ('default', 'custom')),
  CONSTRAINT company_domains_status_check CHECK (status IN ('pending', 'verified', 'active', 'failed', 'disabled')),
  CONSTRAINT company_domains_verification_method_check CHECK (verification_method IN ('cname', 'txt')),
  CONSTRAINT company_domains_ssl_status_check CHECK (ssl_status IN ('pending', 'issuing', 'active', 'failed', 'expired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_domains_domain_unique
  ON public.company_domains (lower(domain));

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_domains_primary_per_company
  ON public.company_domains (company_id)
  WHERE is_primary = true AND status <> 'disabled';

CREATE INDEX IF NOT EXISTS idx_company_domains_company
  ON public.company_domains (company_id, status);

CREATE INDEX IF NOT EXISTS idx_company_domains_lookup
  ON public.company_domains (lower(domain), status);

CREATE TABLE IF NOT EXISTS public.company_domain_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  domain_id UUID REFERENCES public.company_domains(id) ON DELETE SET NULL,
  domain TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_domain_audit_company
  ON public.company_domain_audit_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_domain_audit_domain
  ON public.company_domain_audit_logs (domain_id, created_at DESC);

ALTER TABLE public.company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_domain_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar company_domains" ON public.company_domains;
CREATE POLICY "Usuários autenticados podem gerenciar company_domains"
  ON public.company_domains FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem ver company_domain_audit_logs" ON public.company_domain_audit_logs;
CREATE POLICY "Usuários autenticados podem ver company_domain_audit_logs"
  ON public.company_domain_audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir company_domain_audit_logs" ON public.company_domain_audit_logs;
CREATE POLICY "Usuários autenticados podem inserir company_domain_audit_logs"
  ON public.company_domain_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_company_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.domain IS NOT NULL THEN
    NEW.domain = lower(trim(NEW.domain));
  END IF;
  IF NEW.txt_record_name IS NULL AND NEW.domain IS NOT NULL THEN
    NEW.txt_record_name = '_ativafix.' || NEW.domain;
  END IF;
  IF NEW.txt_record_value IS NULL AND NEW.verification_token IS NOT NULL THEN
    NEW.txt_record_value = 'ativa-fix-verification=' || NEW.verification_token;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_domains_updated_at ON public.company_domains;
CREATE TRIGGER trg_company_domains_updated_at
  BEFORE INSERT OR UPDATE ON public.company_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_company_domains_updated_at();
