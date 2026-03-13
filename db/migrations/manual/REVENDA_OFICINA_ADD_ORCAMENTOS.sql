-- Garante módulo Orçamentos e vínculo com Oficina Mecânica (página /orcamentos).
-- Execute se o menu da Oficina não mostrar "Orçamentos" ou se a página /orcamentos não estiver disponível.

-- 1. Módulo Orçamentos (se não existir)
INSERT INTO public.modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
SELECT 'Orçamentos', 'orcamentos', 'Orçamentos e orçamentos de serviço', 'operacao', 'file-text', '/orcamentos', 'Orçamentos', true
WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE slug = 'orcamentos');

-- 2. Recursos do módulo Orçamentos (se não existirem)
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Criar orçamento', 'criar_orcamento', 'Criar orçamento', 'os.create', true FROM public.modulos m WHERE m.slug = 'orcamentos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'criar_orcamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Aprovar orçamento', 'aprovar_orcamento', 'Aprovar', 'os.edit', true FROM public.modulos m WHERE m.slug = 'orcamentos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'aprovar_orcamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Reprovar orçamento', 'reprovar_orcamento', 'Reprovar', 'os.edit', true FROM public.modulos m WHERE m.slug = 'orcamentos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'reprovar_orcamento');
INSERT INTO public.recursos (modulo_id, nome, slug, descricao, permission_key, ativo)
SELECT m.id, 'Converter orçamento em OS', 'converter_orcamento_os', 'Converter em OS', 'os.create', true FROM public.modulos m WHERE m.slug = 'orcamentos' AND NOT EXISTS (SELECT 1 FROM public.recursos r WHERE r.modulo_id = m.id AND r.slug = 'converter_orcamento_os');

-- 3. Abrir espaço na ordem (ordem 4) para Orçamentos: quem está >= 4 passa a +1 (exceto orçamentos)
UPDATE public.segmentos_modulos sm
SET ordem_menu = sm.ordem_menu + 1
FROM public.modulos mo
WHERE sm.modulo_id = mo.id
  AND sm.segmento_id = (SELECT id FROM public.segmentos WHERE slug = 'oficina_mecanica' LIMIT 1)
  AND sm.ordem_menu >= 4
  AND mo.slug != 'orcamentos';

-- 4. Vínculo Oficina Mecânica ↔ Orçamentos (ordem_menu 4 = após Veículos)
INSERT INTO public.segmentos_modulos (segmento_id, modulo_id, ativo, ordem_menu)
SELECT s.id, m.id, true, 4
FROM public.segmentos s, public.modulos m
WHERE s.slug = 'oficina_mecanica' AND m.slug = 'orcamentos'
ON CONFLICT (segmento_id, modulo_id) DO UPDATE SET ativo = true, ordem_menu = 4;

-- 5. Recursos de Orçamentos liberados para Oficina Mecânica
INSERT INTO public.segmentos_recursos (segmento_id, recurso_id, ativo)
SELECT (SELECT id FROM public.segmentos WHERE slug = 'oficina_mecanica' LIMIT 1), r.id, true
FROM public.recursos r
JOIN public.modulos m ON m.id = r.modulo_id
WHERE m.slug = 'orcamentos'
ON CONFLICT (segmento_id, recurso_id) DO UPDATE SET ativo = true;
