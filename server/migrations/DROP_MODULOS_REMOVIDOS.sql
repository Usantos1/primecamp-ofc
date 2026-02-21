-- ============================================================
-- Migração: Remoção completa dos módulos descontinuados
-- Tabelas: reset-senha/recuperar-acesso, process-analytics, processos,
-- tarefas, calendário, nps, metas, metricas, admin/categories, admin/tags,
-- admin/departments (apenas página; tabelas departments/user_position_departments
-- são mantidas para gestão de usuários), notifications, search, productivity.
--
-- NÃO remove: departments, user_position_departments (usados em usuários/cargos).
-- ============================================================

-- Respostas NPS (FK para nps_surveys)
DROP TABLE IF EXISTS public.nps_responses CASCADE;

-- Pesquisas NPS
DROP TABLE IF EXISTS public.nps_surveys CASCADE;

-- Tarefas (podem referenciar processes, categories)
DROP TABLE IF EXISTS public.tasks CASCADE;

-- Metas / Goals
DROP TABLE IF EXISTS public.goals CASCADE;

-- Eventos do calendário
DROP TABLE IF EXISTS public.calendar_events CASCADE;

-- Processos (pode ter flow_nodes/flow_edges como colunas)
DROP TABLE IF EXISTS public.processes CASCADE;

-- Categorias (usadas por processos/tarefas)
DROP TABLE IF EXISTS public.categories CASCADE;

-- Tags (usadas por processos/tarefas)
DROP TABLE IF EXISTS public.tags CASCADE;

-- Notificações (tabela dedicada, se existir)
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Comentários para auditoria
COMMENT ON SCHEMA public IS 'Schema público - módulos processos, tarefas, calendário, nps, metas, categories, tags removidos por migração DROP_MODULOS_REMOVIDOS.sql';
