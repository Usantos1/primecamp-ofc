-- =====================================================
-- SCRIPT PARA MIGRAR REFERÊNCIAS DE auth.users PARA public.users
-- Remove FK antigas e cria novas apontando para public.users
-- =====================================================

-- 1. Verificar se public.users existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE EXCEPTION 'Tabela public.users não existe! Crie-a primeiro.';
    END IF;
    RAISE NOTICE 'Tabela public.users encontrada ✓';
END $$;

-- 2. Remover foreign keys que referenciam auth.users
DO $$
DECLARE
    r RECORD;
    drop_cmd TEXT;
BEGIN
    RAISE NOTICE '=== REMOVENDO FOREIGN KEYS PARA auth.users ===';
    
    -- Buscar todas as constraints que referenciam auth.users
    FOR r IN (
        SELECT 
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'auth'
        AND tc.table_schema = 'public'
    ) LOOP
        drop_cmd := format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
        RAISE NOTICE 'Removendo: %', drop_cmd;
        EXECUTE drop_cmd;
    END LOOP;
    
    RAISE NOTICE '=== CONSTRAINTS ANTIGAS REMOVIDAS ===';
END $$;

-- Remover constraints específicas conhecidas (backup)
ALTER TABLE IF EXISTS cash_register_sessions DROP CONSTRAINT IF EXISTS cash_register_sessions_operador_id_fkey;
ALTER TABLE IF EXISTS cash_register_sessions DROP CONSTRAINT IF EXISTS cash_register_sessions_closed_by_fkey;
ALTER TABLE IF EXISTS cash_register_sessions DROP CONSTRAINT IF EXISTS cash_register_sessions_user_id_fkey;

ALTER TABLE IF EXISTS sales DROP CONSTRAINT IF EXISTS sales_vendedor_id_fkey;
ALTER TABLE IF EXISTS sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE IF EXISTS sales DROP CONSTRAINT IF EXISTS sales_canceled_by_fkey;

ALTER TABLE IF EXISTS cash_movements DROP CONSTRAINT IF EXISTS cash_movements_operador_id_fkey;
ALTER TABLE IF EXISTS cash_movements DROP CONSTRAINT IF EXISTS cash_movements_user_id_fkey;

ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_confirmed_by_fkey;
ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_canceled_by_fkey;

ALTER TABLE IF EXISTS ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_vendedor_id_fkey;
ALTER TABLE IF EXISTS ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_atendente_id_fkey;
ALTER TABLE IF EXISTS ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_tecnico_id_fkey;
ALTER TABLE IF EXISTS ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_created_by_fkey;

ALTER TABLE IF EXISTS audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE IF EXISTS user_activity_logs DROP CONSTRAINT IF EXISTS user_activity_logs_user_id_fkey;

ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

ALTER TABLE IF EXISTS processes DROP CONSTRAINT IF EXISTS processes_owner_id_fkey;
ALTER TABLE IF EXISTS processes DROP CONSTRAINT IF EXISTS processes_created_by_fkey;

ALTER TABLE IF EXISTS calendar_events DROP CONSTRAINT IF EXISTS calendar_events_user_id_fkey;
ALTER TABLE IF EXISTS calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;

ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;
ALTER TABLE IF EXISTS documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

ALTER TABLE IF EXISTS goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
ALTER TABLE IF EXISTS goals DROP CONSTRAINT IF EXISTS goals_created_by_fkey;

ALTER TABLE IF EXISTS time_clock DROP CONSTRAINT IF EXISTS time_clock_user_id_fkey;

ALTER TABLE IF EXISTS training_assignments DROP CONSTRAINT IF EXISTS training_assignments_user_id_fkey;

ALTER TABLE IF EXISTS lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_id_fkey;

ALTER TABLE IF EXISTS nps_responses DROP CONSTRAINT IF EXISTS nps_responses_user_id_fkey;
ALTER TABLE IF EXISTS nps_surveys DROP CONSTRAINT IF EXISTS nps_surveys_created_by_fkey;

ALTER TABLE IF EXISTS disc_tests DROP CONSTRAINT IF EXISTS disc_tests_user_id_fkey;
ALTER TABLE IF EXISTS disc_responses DROP CONSTRAINT IF EXISTS disc_responses_user_id_fkey;

ALTER TABLE IF EXISTS employee_nps_surveys DROP CONSTRAINT IF EXISTS employee_nps_surveys_created_by_fkey;
ALTER TABLE IF EXISTS employee_nps_responses DROP CONSTRAINT IF EXISTS employee_nps_responses_user_id_fkey;

ALTER TABLE IF EXISTS financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_user_id_fkey;
ALTER TABLE IF EXISTS financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_created_by_fkey;

ALTER TABLE IF EXISTS accounts_receivable DROP CONSTRAINT IF EXISTS accounts_receivable_created_by_fkey;
ALTER TABLE IF EXISTS bills_to_pay DROP CONSTRAINT IF EXISTS bills_to_pay_created_by_fkey;

ALTER TABLE IF EXISTS quotes DROP CONSTRAINT IF EXISTS quotes_created_by_fkey;
ALTER TABLE IF EXISTS quotes DROP CONSTRAINT IF EXISTS quotes_vendedor_id_fkey;

ALTER TABLE IF EXISTS warranties DROP CONSTRAINT IF EXISTS warranties_created_by_fkey;

ALTER TABLE IF EXISTS sale_cancel_requests DROP CONSTRAINT IF EXISTS sale_cancel_requests_solicitante_id_fkey;
ALTER TABLE IF EXISTS sale_cancel_requests DROP CONSTRAINT IF EXISTS sale_cancel_requests_aprovado_por_fkey;

ALTER TABLE IF EXISTS permission_changes_history DROP CONSTRAINT IF EXISTS permission_changes_history_user_id_fkey;
ALTER TABLE IF EXISTS permission_changes_history DROP CONSTRAINT IF EXISTS permission_changes_history_changed_by_fkey;

ALTER TABLE IF EXISTS user_permissions DROP CONSTRAINT IF EXISTS user_permissions_user_id_fkey;
ALTER TABLE IF EXISTS user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE IF EXISTS user_position_departments DROP CONSTRAINT IF EXISTS user_position_departments_user_id_fkey;

ALTER TABLE IF EXISTS telegram_messages DROP CONSTRAINT IF EXISTS telegram_messages_sent_by_fkey;

ALTER TABLE IF EXISTS job_candidate_evaluations DROP CONSTRAINT IF EXISTS job_candidate_evaluations_evaluator_id_fkey;
ALTER TABLE IF EXISTS job_interviews DROP CONSTRAINT IF EXISTS job_interviews_interviewer_id_fkey;

ALTER TABLE IF EXISTS cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_created_by_fkey;
ALTER TABLE IF EXISTS cash_closings DROP CONSTRAINT IF EXISTS cash_closings_closed_by_fkey;

-- =====================================================
-- 3. CRIAR NOVAS FOREIGN KEYS PARA public.users
-- Com ON DELETE SET NULL para manter rastreabilidade
-- =====================================================

-- Função auxiliar para criar FK com segurança
CREATE OR REPLACE FUNCTION create_fk_if_column_exists(
    p_table TEXT,
    p_column TEXT,
    p_constraint_name TEXT
) RETURNS void AS $$
BEGIN
    -- Verificar se a coluna existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table 
        AND column_name = p_column
    ) THEN
        -- Remover constraint antiga se existir
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', p_table, p_constraint_name);
        
        -- Criar nova constraint
        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.users(id) ON DELETE SET NULL',
            p_table, p_constraint_name, p_column
        );
        RAISE NOTICE 'FK criada: %.% -> public.users', p_table, p_column;
    ELSE
        RAISE NOTICE 'Coluna %.% não existe, pulando...', p_table, p_column;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Erro ao criar FK %.%: %', p_table, p_column, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Criar FKs para tabelas principais
SELECT create_fk_if_column_exists('cash_register_sessions', 'operador_id', 'fk_cash_sessions_operador');
SELECT create_fk_if_column_exists('cash_register_sessions', 'closed_by', 'fk_cash_sessions_closed_by');

SELECT create_fk_if_column_exists('sales', 'vendedor_id', 'fk_sales_vendedor');
SELECT create_fk_if_column_exists('sales', 'canceled_by', 'fk_sales_canceled_by');

SELECT create_fk_if_column_exists('cash_movements', 'operador_id', 'fk_cash_movements_operador');

SELECT create_fk_if_column_exists('payments', 'confirmed_by', 'fk_payments_confirmed_by');
SELECT create_fk_if_column_exists('payments', 'canceled_by', 'fk_payments_canceled_by');

SELECT create_fk_if_column_exists('ordens_servico', 'vendedor_id', 'fk_os_vendedor');
SELECT create_fk_if_column_exists('ordens_servico', 'atendente_id', 'fk_os_atendente');
SELECT create_fk_if_column_exists('ordens_servico', 'tecnico_id', 'fk_os_tecnico');
SELECT create_fk_if_column_exists('ordens_servico', 'created_by', 'fk_os_created_by');

SELECT create_fk_if_column_exists('audit_logs', 'user_id', 'fk_audit_logs_user');

SELECT create_fk_if_column_exists('user_activity_logs', 'user_id', 'fk_activity_logs_user');

SELECT create_fk_if_column_exists('tasks', 'user_id', 'fk_tasks_user');
SELECT create_fk_if_column_exists('tasks', 'assigned_to', 'fk_tasks_assigned');
SELECT create_fk_if_column_exists('tasks', 'created_by', 'fk_tasks_created_by');

SELECT create_fk_if_column_exists('processes', 'owner_id', 'fk_processes_owner');
SELECT create_fk_if_column_exists('processes', 'created_by', 'fk_processes_created_by');

SELECT create_fk_if_column_exists('calendar_events', 'user_id', 'fk_calendar_user');
SELECT create_fk_if_column_exists('calendar_events', 'created_by', 'fk_calendar_created_by');

SELECT create_fk_if_column_exists('documents', 'user_id', 'fk_documents_user');
SELECT create_fk_if_column_exists('documents', 'uploaded_by', 'fk_documents_uploaded_by');

SELECT create_fk_if_column_exists('goals', 'user_id', 'fk_goals_user');
SELECT create_fk_if_column_exists('goals', 'created_by', 'fk_goals_created_by');

SELECT create_fk_if_column_exists('time_clock', 'user_id', 'fk_time_clock_user');

SELECT create_fk_if_column_exists('training_assignments', 'user_id', 'fk_training_assign_user');

SELECT create_fk_if_column_exists('lesson_progress', 'user_id', 'fk_lesson_progress_user');

SELECT create_fk_if_column_exists('nps_responses', 'user_id', 'fk_nps_responses_user');
SELECT create_fk_if_column_exists('nps_surveys', 'created_by', 'fk_nps_surveys_created_by');

SELECT create_fk_if_column_exists('disc_tests', 'user_id', 'fk_disc_tests_user');
SELECT create_fk_if_column_exists('disc_responses', 'user_id', 'fk_disc_responses_user');

SELECT create_fk_if_column_exists('employee_nps_surveys', 'created_by', 'fk_emp_nps_surveys_created_by');
SELECT create_fk_if_column_exists('employee_nps_responses', 'user_id', 'fk_emp_nps_responses_user');

SELECT create_fk_if_column_exists('financial_transactions', 'user_id', 'fk_fin_trans_user');
SELECT create_fk_if_column_exists('financial_transactions', 'created_by', 'fk_fin_trans_created_by');

SELECT create_fk_if_column_exists('accounts_receivable', 'created_by', 'fk_accts_recv_created_by');
SELECT create_fk_if_column_exists('bills_to_pay', 'created_by', 'fk_bills_created_by');

SELECT create_fk_if_column_exists('quotes', 'created_by', 'fk_quotes_created_by');
SELECT create_fk_if_column_exists('quotes', 'vendedor_id', 'fk_quotes_vendedor');

SELECT create_fk_if_column_exists('warranties', 'created_by', 'fk_warranties_created_by');

SELECT create_fk_if_column_exists('sale_cancel_requests', 'solicitante_id', 'fk_cancel_req_solicitante');
SELECT create_fk_if_column_exists('sale_cancel_requests', 'aprovado_por', 'fk_cancel_req_aprovador');

SELECT create_fk_if_column_exists('permission_changes_history', 'user_id', 'fk_perm_history_user');
SELECT create_fk_if_column_exists('permission_changes_history', 'changed_by', 'fk_perm_history_changed_by');

SELECT create_fk_if_column_exists('user_permissions', 'user_id', 'fk_user_permissions_user');
SELECT create_fk_if_column_exists('user_roles', 'user_id', 'fk_user_roles_user');
SELECT create_fk_if_column_exists('user_position_departments', 'user_id', 'fk_user_pos_dept_user');

SELECT create_fk_if_column_exists('telegram_messages', 'sent_by', 'fk_telegram_msg_sent_by');

SELECT create_fk_if_column_exists('job_candidate_evaluations', 'evaluator_id', 'fk_job_eval_evaluator');
SELECT create_fk_if_column_exists('job_interviews', 'interviewer_id', 'fk_job_interview_interviewer');

SELECT create_fk_if_column_exists('cash_transactions', 'created_by', 'fk_cash_trans_created_by');
SELECT create_fk_if_column_exists('cash_closings', 'closed_by', 'fk_cash_closings_closed_by');

-- Remover função auxiliar
DROP FUNCTION IF EXISTS create_fk_if_column_exists;

-- =====================================================
-- 4. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se ainda existem referências a auth.users
SELECT 
    tc.table_name,
    tc.constraint_name,
    ccu.table_schema as ref_schema,
    ccu.table_name as ref_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND ccu.table_schema = 'auth';

-- Listar novas FKs criadas para public.users
SELECT 
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND ccu.table_schema = 'public'
AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- Mostrar resultado
SELECT '✅ Migração concluída! FKs agora apontam para public.users' as resultado;

