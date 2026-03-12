-- Adiciona o módulo PDV ao segmento Oficina Mecânica (para quem já rodou REVENDA_MULTI_SEGMENTO antes).
-- Pode ser executado em produção para passar a exibir PDV no menu da oficina.
INSERT INTO public.segmentos_modulos (segmento_id, modulo_id, ativo, ordem_menu)
SELECT s.id, m.id, true, 5
FROM public.segmentos s, public.modulos m
WHERE s.slug = 'oficina_mecanica' AND m.slug = 'pdv'
ON CONFLICT (segmento_id, modulo_id) DO UPDATE SET ativo = true, ordem_menu = 5;
