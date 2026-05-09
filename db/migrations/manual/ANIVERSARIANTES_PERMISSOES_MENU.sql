-- Permissoes e menu para Pos-venda e Aniversariantes por cargo.
-- Execute na VPS com:
-- psql "$DATABASE_URL" -f db/migrations/manual/ANIVERSARIANTES_PERMISSOES_MENU.sql

BEGIN;

INSERT INTO public.permissions (resource, action, description, category) VALUES
  ('pos_venda', 'view', 'Visualizar pós-venda', 'pos_venda'),
  ('pos_venda', 'manage', 'Gerenciar mensagens de pós-venda', 'pos_venda'),
  ('pos_venda', 'config', 'Configurar pós-venda', 'pos_venda'),
  ('aniversariantes', 'view', 'Visualizar aniversariantes', 'aniversariantes'),
  ('aniversariantes', 'manage', 'Gerenciar mensagens de aniversário', 'aniversariantes'),
  ('aniversariantes', 'config', 'Configurar aniversariantes', 'aniversariantes')
ON CONFLICT (resource, action) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Pós-venda', 'pos_venda', 'Automação e histórico de acompanhamento ao cliente', 'relatorios', 'message-circle', '/pos-venda', 'Pós-venda', true
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modulos')
  AND NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'pos_venda');

INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Aniversariantes', 'aniversariantes', 'Mensagens automáticas de aniversário no WhatsApp', 'relatorios', 'cake', '/aniversariantes', 'Aniversariantes', true
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modulos')
  AND NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'aniversariantes');

UPDATE public.modulos
SET categoria = 'relatorios',
    icone = 'message-circle',
    path = '/pos-venda',
    label_menu = 'Pós-venda',
    ativo = true,
    updated_at = NOW()
WHERE slug = 'pos_venda';

UPDATE public.modulos
SET categoria = 'relatorios',
    icone = 'cake',
    path = '/aniversariantes',
    label_menu = 'Aniversariantes',
    ativo = true,
    updated_at = NOW()
WHERE slug = 'aniversariantes';

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Visualizar pós-venda', 'visualizar_pos_venda', 'Acessar tela de pós-venda', 'pos_venda.view', true
FROM public.modulos m
WHERE m.slug = 'pos_venda'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'visualizar_pos_venda');

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Gerenciar pós-venda', 'gerenciar_pos_venda', 'Gerenciar mensagens e fila de pós-venda', 'pos_venda.manage', true
FROM public.modulos m
WHERE m.slug = 'pos_venda'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'gerenciar_pos_venda');

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Configurar pós-venda', 'configurar_pos_venda', 'Configurar mensagem e automação de pós-venda', 'pos_venda.config', true
FROM public.modulos m
WHERE m.slug = 'pos_venda'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'configurar_pos_venda');

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Visualizar aniversariantes', 'visualizar_aniversariantes', 'Acessar tela de aniversariantes', 'aniversariantes.view', true
FROM public.modulos m
WHERE m.slug = 'aniversariantes'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'visualizar_aniversariantes');

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Gerenciar aniversariantes', 'gerenciar_aniversariantes', 'Gerenciar mensagens e fila de aniversário', 'aniversariantes.manage', true
FROM public.modulos m
WHERE m.slug = 'aniversariantes'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'gerenciar_aniversariantes');

INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Configurar aniversariantes', 'configurar_aniversariantes', 'Configurar mensagem e automação de aniversário', 'aniversariantes.config', true
FROM public.modulos m
WHERE m.slug = 'aniversariantes'
  AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'configurar_aniversariantes');

INSERT INTO public.segmentos_modulos (segmento_id, modulo_id, ativo, ordem_menu)
SELECT s.id, m.id, true,
       CASE m.slug
         WHEN 'pos_venda' THEN 90
         WHEN 'aniversariantes' THEN 91
         ELSE 99
       END
FROM public.segmentos s
JOIN public.modulos m ON m.slug IN ('pos_venda', 'aniversariantes')
WHERE s.ativo = true
ON CONFLICT (segmento_id, modulo_id) DO UPDATE SET
  ativo = true,
  ordem_menu = EXCLUDED.ordem_menu,
  updated_at = NOW();

INSERT INTO public.segmentos_recursos (segmento_id, recurso_id, ativo)
SELECT sm.segmento_id, r.id, true
FROM public.segmentos_modulos sm
JOIN public.modulos m ON m.id = sm.modulo_id AND m.slug IN ('pos_venda', 'aniversariantes')
JOIN public.recursos r ON r.modulo_id = m.id
ON CONFLICT (segmento_id, recurso_id) DO UPDATE SET
  ativo = true,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (p.resource || '.' || p.action) IN (
  'pos_venda.view',
  'aniversariantes.view'
)
WHERE r.name IN ('vendedor', 'sales', 'atendente', 'gerente')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (p.resource || '.' || p.action) IN (
  'pos_venda.manage',
  'pos_venda.config',
  'aniversariantes.manage',
  'aniversariantes.config'
)
WHERE r.name IN ('gerente')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_modulos (role_id, modulo_id, ativo, ordem_menu)
SELECT r.id, m.id, true,
       CASE m.slug
         WHEN 'pos_venda' THEN 90
         WHEN 'aniversariantes' THEN 91
         ELSE 99
       END
FROM public.roles r
JOIN public.modulos m ON m.slug IN ('pos_venda', 'aniversariantes')
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_modulos')
  AND r.name IN ('vendedor', 'sales', 'atendente', 'gerente')
ON CONFLICT (role_id, modulo_id) DO UPDATE SET
  ativo = true,
  ordem_menu = EXCLUDED.ordem_menu,
  updated_at = NOW();

INSERT INTO public.role_recursos (role_id, recurso_id, ativo)
SELECT r.id, rec.id, true
FROM public.roles r
JOIN public.modulos m ON m.slug IN ('pos_venda', 'aniversariantes')
JOIN public.recursos rec ON rec.modulo_id = m.id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_recursos')
  AND r.name IN ('vendedor', 'sales', 'atendente', 'gerente')
  AND (
    r.name = 'gerente'
    OR rec.permission_key IN ('pos_venda.view', 'aniversariantes.view')
  )
ON CONFLICT (role_id, recurso_id) DO UPDATE SET
  ativo = true,
  updated_at = NOW();

COMMIT;
