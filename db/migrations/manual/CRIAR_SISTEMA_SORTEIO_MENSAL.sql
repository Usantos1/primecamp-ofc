-- =====================================================
-- SISTEMA DE SORTEIO MENSAL
-- Configurações, sorteios mensais, cupons, mensagens e auditoria
-- =====================================================

CREATE TABLE IF NOT EXISTS public.raffle_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  is_active BOOLEAN NOT NULL DEFAULT false,
  campaign_name TEXT NOT NULL DEFAULT 'Sorteio Mensal',
  amount_per_coupon NUMERIC(12,2) NOT NULL DEFAULT 10,
  initial_number INTEGER NOT NULL DEFAULT 100,
  draw_day_type TEXT NOT NULL DEFAULT 'last_day_of_month' CHECK (draw_day_type IN ('last_day_of_month', 'fixed_day')),
  fixed_draw_day INTEGER,
  draw_time TIME NOT NULL DEFAULT '20:00',
  auto_draw_enabled BOOLEAN NOT NULL DEFAULT false,
  send_coupon_message_enabled BOOLEAN NOT NULL DEFAULT false,
  send_winner_message_enabled BOOLEAN NOT NULL DEFAULT false,
  coupon_message_template TEXT NOT NULL DEFAULT 'Olá, {cliente}! Obrigado por comprar na {empresa}. Você recebeu {quantidade_cupons} número(s) da sorte para o sorteio {nome_sorteio}: {numeros_da_sorte}. Sorteio em {data_sorteio}. Boa sorte!',
  winner_message_template TEXT NOT NULL DEFAULT 'Parabéns, {cliente}! O seu número da sorte {numero_sorteado} foi o ganhador do sorteio {nome_sorteio} da {empresa}. Prêmio: {premio}. Validade: {validade_premio}. Retirada: {retirada_premio}. Obrigado por comprar com a gente!',
  prize_description TEXT NOT NULL DEFAULT 'Vale-compra',
  prize_value NUMERIC(12,2) NOT NULL DEFAULT 100,
  prize_validity_days INTEGER NOT NULL DEFAULT 7,
  prize_redeem_instructions TEXT NOT NULL DEFAULT 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
  rounding_rule TEXT NOT NULL DEFAULT 'complete_value' CHECK (rounding_rule IN ('complete_value')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  raffle_setting_id UUID REFERENCES public.raffle_settings(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  reference_month INTEGER NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
  draw_executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'drawn', 'cancelled')),
  total_coupons INTEGER NOT NULL DEFAULT 0,
  total_participants INTEGER NOT NULL DEFAULT 0,
  eligible_sales_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  winning_coupon_id UUID,
  winning_customer_id UUID,
  prize_description TEXT,
  prize_value NUMERIC(12,2),
  prize_validity_days INTEGER,
  prize_redeem_instructions TEXT,
  draw_origin TEXT CHECK (draw_origin IN ('automatic', 'manual')),
  drawn_by_user_id UUID,
  cancelled_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, reference_month, reference_year)
);

CREATE TABLE IF NOT EXISTS public.raffle_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  customer_id UUID,
  sale_id UUID,
  service_order_id UUID,
  order_type TEXT NOT NULL CHECK (order_type IN ('sale', 'service_order')),
  coupon_number INTEGER NOT NULL,
  eligible_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  source_total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'cancelled', 'winner')),
  generated_by_user_id UUID,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, raffle_id, coupon_number)
);

CREATE TABLE IF NOT EXISTS public.raffle_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  raffle_id UUID REFERENCES public.raffles(id) ON DELETE SET NULL,
  coupon_id UUID REFERENCES public.raffle_coupons(id) ON DELETE SET NULL,
  customer_id UUID,
  phone TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('coupon_generated', 'winner_notification')),
  message_body TEXT NOT NULL,
  send_status TEXT NOT NULL DEFAULT 'pending' CHECK (send_status IN ('pending', 'sent', 'failed')),
  external_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raffle_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  raffle_id UUID REFERENCES public.raffles(id) ON DELETE SET NULL,
  coupon_id UUID REFERENCES public.raffle_coupons(id) ON DELETE SET NULL,
  customer_id UUID,
  sale_id UUID,
  service_order_id UUID,
  user_id UUID,
  action TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'system' CHECK (origin IN ('system', 'user', 'cron', 'api')),
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raffles_company_reference ON public.raffles(company_id, reference_year, reference_month);
CREATE INDEX IF NOT EXISTS idx_raffle_coupons_raffle_status ON public.raffle_coupons(raffle_id, status);
CREATE INDEX IF NOT EXISTS idx_raffle_coupons_customer ON public.raffle_coupons(customer_id);
CREATE INDEX IF NOT EXISTS idx_raffle_coupons_sale ON public.raffle_coupons(sale_id);
CREATE INDEX IF NOT EXISTS idx_raffle_message_logs_raffle ON public.raffle_message_logs(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_audit_logs_raffle ON public.raffle_audit_logs(raffle_id);

ALTER TABLE public.raffle_settings
  ADD COLUMN IF NOT EXISTS prize_description TEXT NOT NULL DEFAULT 'Vale-compra',
  ADD COLUMN IF NOT EXISTS prize_value NUMERIC(12,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS prize_validity_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS prize_redeem_instructions TEXT NOT NULL DEFAULT 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.';

ALTER TABLE public.raffles
  ADD COLUMN IF NOT EXISTS prize_description TEXT,
  ADD COLUMN IF NOT EXISTS prize_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS prize_validity_days INTEGER,
  ADD COLUMN IF NOT EXISTS prize_redeem_instructions TEXT;

UPDATE public.raffle_settings
SET winner_message_template =
  winner_message_template ||
  CASE WHEN winner_message_template NOT LIKE '%{premio}%' THEN E'\n\nPrêmio: {premio}.' ELSE '' END ||
  CASE WHEN winner_message_template NOT LIKE '%{validade_premio}%' THEN E'\nValidade: {validade_premio}.' ELSE '' END ||
  CASE WHEN winner_message_template NOT LIKE '%{retirada_premio}%' THEN E'\nRetirada: {retirada_premio}.' ELSE '' END,
  prize_description = COALESCE(NULLIF(prize_description, ''), 'Vale-compra'),
  prize_value = COALESCE(prize_value, 100),
  prize_validity_days = COALESCE(prize_validity_days, 7),
  prize_redeem_instructions = COALESCE(NULLIF(prize_redeem_instructions, ''), 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.'),
  updated_at = NOW()
WHERE winner_message_template NOT LIKE '%{premio}%'
   OR winner_message_template NOT LIKE '%{validade_premio}%'
   OR winner_message_template NOT LIKE '%{retirada_premio}%'
   OR prize_description IS NULL
   OR prize_value IS NULL
   OR prize_validity_days IS NULL
   OR prize_redeem_instructions IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_raffles_winning_coupon') THEN
    ALTER TABLE public.raffles
      ADD CONSTRAINT fk_raffles_winning_coupon
      FOREIGN KEY (winning_coupon_id) REFERENCES public.raffle_coupons(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.raffle_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar raffle_settings" ON public.raffle_settings;
CREATE POLICY "Usuários autenticados podem gerenciar raffle_settings"
  ON public.raffle_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar raffles" ON public.raffles;
CREATE POLICY "Usuários autenticados podem gerenciar raffles"
  ON public.raffles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar raffle_coupons" ON public.raffle_coupons;
CREATE POLICY "Usuários autenticados podem gerenciar raffle_coupons"
  ON public.raffle_coupons FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar raffle_message_logs" ON public.raffle_message_logs;
CREATE POLICY "Usuários autenticados podem gerenciar raffle_message_logs"
  ON public.raffle_message_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem ver raffle_audit_logs" ON public.raffle_audit_logs;
CREATE POLICY "Usuários autenticados podem ver raffle_audit_logs"
  ON public.raffle_audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir raffle_audit_logs" ON public.raffle_audit_logs;
CREATE POLICY "Usuários autenticados podem inserir raffle_audit_logs"
  ON public.raffle_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- PERMISSÕES E MENU DO MÓDULO
-- =====================================================

INSERT INTO public.permissions (resource, action, description, category) VALUES
  ('sorteios', 'view', 'Visualizar sorteios', 'sorteios'),
  ('sorteios', 'config', 'Configurar sorteios', 'sorteios'),
  ('sorteios', 'generate', 'Gerar cupons de sorteio', 'sorteios'),
  ('sorteios', 'cancel', 'Cancelar cupons de sorteio', 'sorteios'),
  ('sorteios', 'draw', 'Executar sorteio manual', 'sorteios'),
  ('sorteios', 'audit', 'Visualizar auditoria de sorteios', 'sorteios'),
  ('sorteios', 'export', 'Exportar relatórios de sorteios', 'sorteios')
ON CONFLICT (resource, action) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Sorteios', 'sorteios', 'Sistema de sorteio mensal e números da sorte', 'relatorios', 'trophy', '/sorteios', 'Sorteios', true
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modulos')
  AND NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'sorteios');

UPDATE public.modulos
SET categoria = 'relatorios',
    icone = 'trophy',
    path = '/sorteios',
    label_menu = 'Sorteios',
    ativo = true,
    updated_at = NOW()
WHERE slug = 'sorteios';

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Visualizar sorteios', 'visualizar_sorteios', 'Acessar o módulo de sorteios', 'sorteios.view', true
FROM public.modulos m
WHERE m.slug = 'sorteios'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'visualizar_sorteios');

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Configurar sorteios', 'configurar_sorteios', 'Alterar regras do sorteio mensal', 'sorteios.config', true
FROM public.modulos m
WHERE m.slug = 'sorteios'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'configurar_sorteios');

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Executar sorteio manual', 'executar_sorteio_manual', 'Executar sorteio manualmente', 'sorteios.draw', true
FROM public.modulos m
WHERE m.slug = 'sorteios'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'executar_sorteio_manual');

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Auditoria de sorteios', 'auditoria_sorteios', 'Visualizar logs e relatórios de sorteio', 'sorteios.audit', true
FROM public.modulos m
WHERE m.slug = 'sorteios'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'auditoria_sorteios');

INSERT INTO public.segmentos_modulos (segmento_id, modulo_id, ativo, ordem_menu)
SELECT s.id, m.id, true, 92
FROM public.segmentos s
JOIN public.modulos m ON m.slug = 'sorteios'
WHERE s.ativo = true
ON CONFLICT (segmento_id, modulo_id) DO UPDATE SET
  ativo = true,
  ordem_menu = EXCLUDED.ordem_menu,
  updated_at = NOW();

INSERT INTO public.segmentos_recursos (segmento_id, recurso_id, ativo)
SELECT sm.segmento_id, r.id, true
FROM public.segmentos_modulos sm
JOIN public.modulos m ON m.id = sm.modulo_id AND m.slug = 'sorteios'
JOIN public.recursos r ON r.modulo_id = m.id
ON CONFLICT (segmento_id, recurso_id) DO UPDATE SET
  ativo = true,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (p.resource || '.' || p.action) IN ('sorteios.view')
WHERE r.name IN ('vendedor', 'sales', 'atendente', 'gerente')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (p.resource || '.' || p.action) IN (
  'sorteios.config',
  'sorteios.generate',
  'sorteios.cancel',
  'sorteios.draw',
  'sorteios.audit',
  'sorteios.export'
)
WHERE r.name IN ('gerente')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_modulos (role_id, modulo_id, ativo, ordem_menu)
SELECT r.id, m.id, true, 92
FROM public.roles r
JOIN public.modulos m ON m.slug = 'sorteios'
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_modulos')
  AND r.name IN ('vendedor', 'sales', 'atendente', 'gerente')
ON CONFLICT (role_id, modulo_id) DO UPDATE SET
  ativo = true,
  ordem_menu = EXCLUDED.ordem_menu,
  updated_at = NOW();

INSERT INTO public.role_recursos (role_id, recurso_id, ativo)
SELECT r.id, rec.id, true
FROM public.roles r
JOIN public.modulos m ON m.slug = 'sorteios'
JOIN public.recursos rec ON rec.modulo_id = m.id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_recursos')
  AND r.name IN ('vendedor', 'sales', 'atendente', 'gerente')
  AND (
    r.name = 'gerente'
    OR rec.permission_key = 'sorteios.view'
  )
ON CONFLICT (role_id, recurso_id) DO UPDATE SET
  ativo = true,
  updated_at = NOW();
