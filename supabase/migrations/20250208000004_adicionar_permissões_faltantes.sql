-- ============================================
-- ADICIONAR PERMISSÕES FALTANTES (NPS, DISC, etc)
-- ============================================

-- NPS
INSERT INTO public.permissions (resource, action, description, category) VALUES
('nps', 'view', 'Ver e responder pesquisas NPS', 'rh'),
('nps', 'manage', 'Gerenciar pesquisas NPS (criar, editar, excluir)', 'admin')
ON CONFLICT (resource, action) DO NOTHING;

-- DISC
INSERT INTO public.permissions (resource, action, description, category) VALUES
('disc', 'view', 'Fazer teste DISC', 'rh'),
('disc', 'manage', 'Gerenciar testes DISC', 'admin')
ON CONFLICT (resource, action) DO NOTHING;

-- ADMIN - NPS
INSERT INTO public.permissions (resource, action, description, category) VALUES
('admin', 'nps', 'Gerenciar NPS no painel admin', 'admin')
ON CONFLICT (resource, action) DO NOTHING;

-- ADMIN - DISC
INSERT INTO public.permissions (resource, action, description, category) VALUES
('admin', 'disc', 'Gerenciar DISC no painel admin', 'admin')
ON CONFLICT (resource, action) DO NOTHING;

-- ADMIN - TIMECLOCK
INSERT INTO public.permissions (resource, action, description, category) VALUES
('admin', 'timeclock', 'Gerenciar ponto eletrônico no painel admin', 'admin')
ON CONFLICT (resource, action) DO NOTHING;

