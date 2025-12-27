-- =====================================================
-- SCRIPT PARA REMOVER TODAS AS REFERÊNCIAS A auth.users
-- Executa em todas as tabelas do sistema
-- =====================================================

-- Listar todas as foreign keys que referenciam auth.users
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
        AND (ccu.table_schema = 'auth' OR ccu.table_name = 'users')
        AND tc.table_schema = 'public'
    ) LOOP
        drop_cmd := format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
        RAISE NOTICE 'Executando: %', drop_cmd;
        EXECUTE drop_cmd;
    END LOOP;
    
    RAISE NOTICE '=== CONCLUÍDO ===';
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
AND (ccu.table_schema = 'auth' OR (ccu.table_name = 'users' AND ccu.table_schema != 'public'));

-- Mostrar resultado
SELECT 'Foreign keys para auth.users removidas com sucesso!' as resultado;

