-- Sistema whitelabel por empresa
-- Execute no banco principal. Script idempotente.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  system_name TEXT,
  logo_url TEXT,
  logo_alt TEXT,
  favicon_url TEXT,
  login_background_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '160 84% 30%',
  sidebar_color TEXT NOT NULL DEFAULT '160 84% 30%',
  button_color TEXT NOT NULL DEFAULT '160 84% 30%',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_branding_company_unique
  ON public.company_branding (company_id);

CREATE INDEX IF NOT EXISTS idx_company_branding_enabled
  ON public.company_branding (company_id, enabled);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

UPDATE public.companies c
SET settings = COALESCE(c.settings, '{}'::jsonb) || jsonb_build_object('white_label_enabled', true),
    updated_at = now()
FROM public.subscriptions s
JOIN public.plans p ON p.id = s.plan_id
WHERE s.company_id = c.id
  AND s.status IN ('active', 'trial')
  AND (p.features->>'white_label')::boolean = true
  AND COALESCE((c.settings->>'white_label_enabled')::boolean, false) = false;

ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar company_branding" ON public.company_branding;
CREATE POLICY "Usuários autenticados podem gerenciar company_branding"
  ON public.company_branding FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_company_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_branding_updated_at ON public.company_branding;
CREATE TRIGGER trg_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_company_branding_updated_at();
