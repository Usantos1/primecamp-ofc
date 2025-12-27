-- =====================================================
-- CORREÇÃO COMPLETA DO SCHEMA - BANCO POSTGRES
-- =====================================================
-- Este script corrige:
-- 1. Remove todas as FKs que referenciam auth.users
-- 2. Adiciona colunas faltando em tabelas importantes
-- 3. Cria tabelas que possam estar faltando
-- =====================================================

-- 1. REMOVER TODAS AS FOREIGN KEYS PARA auth.users
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name = 'users' AND ccu.table_schema = 'auth')
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || 
                ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        RAISE NOTICE 'Removida FK: % de %', r.constraint_name, r.table_name;
    END LOOP;
END $$;

-- Remover FKs específicas conhecidas
ALTER TABLE IF EXISTS public.sales DROP CONSTRAINT IF EXISTS sales_vendedor_id_fkey;
ALTER TABLE IF EXISTS public.sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE IF EXISTS public.sales DROP CONSTRAINT IF EXISTS sales_canceled_by_fkey;
ALTER TABLE IF EXISTS public.sales DROP CONSTRAINT IF EXISTS sales_cliente_id_fkey;
ALTER TABLE IF EXISTS public.payments DROP CONSTRAINT IF EXISTS payments_confirmed_by_fkey;
ALTER TABLE IF EXISTS public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE IF EXISTS public.cash_register_sessions DROP CONSTRAINT IF EXISTS cash_register_sessions_operador_id_fkey;
ALTER TABLE IF EXISTS public.cash_register_sessions DROP CONSTRAINT IF EXISTS cash_register_sessions_closed_by_fkey;
ALTER TABLE IF EXISTS public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_user_id_fkey;
ALTER TABLE IF EXISTS public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_created_by_fkey;

-- 2. AJUSTAR TABELA audit_logs
-- =====================================================
DO $$
BEGIN
    -- Criar tabela se não existir
    CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        old_data JSONB,
        new_data JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Adicionar colunas faltando
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'created_at') THEN
        ALTER TABLE public.audit_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'updated_at') THEN
        ALTER TABLE public.audit_logs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    RAISE NOTICE 'Tabela audit_logs ajustada';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Erro ao ajustar audit_logs: %', SQLERRM;
END $$;

-- 3. AJUSTAR TABELA training_assignments
-- =====================================================
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.training_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        training_id UUID NOT NULL,
        user_id UUID NOT NULL,
        assigned_by UUID,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        due_date TIMESTAMPTZ,
        status TEXT DEFAULT 'assigned',
        progress NUMERIC DEFAULT 0,
        last_watched_seconds INTEGER DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Criar índice único para evitar duplicatas
    CREATE UNIQUE INDEX IF NOT EXISTS idx_training_assignments_unique 
        ON training_assignments(training_id, user_id);

    RAISE NOTICE 'Tabela training_assignments ajustada';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Erro ao ajustar training_assignments: %', SQLERRM;
END $$;

-- 4. AJUSTAR TABELA disc_responses
-- =====================================================
DO $$
BEGIN
    -- Adicionar colunas faltando em disc_responses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disc_responses') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disc_responses' AND column_name = 'dominant') THEN
            ALTER TABLE public.disc_responses ADD COLUMN dominant TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disc_responses' AND column_name = 'd_score') THEN
            ALTER TABLE public.disc_responses ADD COLUMN d_score NUMERIC DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disc_responses' AND column_name = 'i_score') THEN
            ALTER TABLE public.disc_responses ADD COLUMN i_score NUMERIC DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disc_responses' AND column_name = 's_score') THEN
            ALTER TABLE public.disc_responses ADD COLUMN s_score NUMERIC DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disc_responses' AND column_name = 'c_score') THEN
            ALTER TABLE public.disc_responses ADD COLUMN c_score NUMERIC DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disc_responses' AND column_name = 'id') THEN
            ALTER TABLE public.disc_responses ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disc_responses' AND column_name = 'created_at') THEN
            ALTER TABLE public.disc_responses ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disc_responses' AND column_name = 'updated_at') THEN
            ALTER TABLE public.disc_responses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    ELSE
        -- Criar tabela se não existir
        CREATE TABLE public.disc_responses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            test_id UUID,
            responses JSONB,
            d_score NUMERIC DEFAULT 0,
            i_score NUMERIC DEFAULT 0,
            s_score NUMERIC DEFAULT 0,
            c_score NUMERIC DEFAULT 0,
            dominant TEXT,
            is_completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    RAISE NOTICE 'Tabela disc_responses ajustada';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Erro ao ajustar disc_responses: %', SQLERRM;
END $$;

-- 5. AJUSTAR TODAS AS TABELAS kv_store_*
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE tablename LIKE 'kv_store_%' AND schemaname = 'public') LOOP
        -- Adicionar created_at se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = r.tablename AND column_name = 'created_at') THEN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()';
            RAISE NOTICE 'Adicionada coluna created_at à tabela %', r.tablename;
        END IF;

        -- Adicionar updated_at se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = r.tablename AND column_name = 'updated_at') THEN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()';
            RAISE NOTICE 'Adicionada coluna updated_at à tabela %', r.tablename;
        END IF;
    END LOOP;
END $$;

-- 6. CRIAR TABELAS DE TREINAMENTO SE NÃO EXISTIREM
-- =====================================================
CREATE TABLE IF NOT EXISTS public.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID REFERENCES trainings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    training_id UUID,
    progress NUMERIC DEFAULT 0,
    last_watched_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- 7. CRIAR TABELAS DE QUIZ SE NÃO EXISTIREM
-- =====================================================
CREATE TABLE IF NOT EXISTS public.training_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID REFERENCES trainings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score NUMERIC DEFAULT 70,
    order_index INTEGER DEFAULT 0,
    time_limit_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES training_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    points NUMERIC DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES training_quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    score NUMERIC DEFAULT 0,
    passed BOOLEAN DEFAULT FALSE,
    time_spent_seconds INTEGER,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    selected_option_id UUID,
    answer_text TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    points_earned NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CRIAR TABELAS DE PONTO SE NÃO EXISTIREM
-- =====================================================
CREATE TABLE IF NOT EXISTS public.time_clock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    break_start TIMESTAMPTZ,
    break_end TIMESTAMPTZ,
    lunch_start TIMESTAMPTZ,
    lunch_end TIMESTAMPTZ,
    total_hours TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    location TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CRIAR TABELAS DE GAMIFICAÇÃO SE NÃO EXISTIREM
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    points INTEGER DEFAULT 0,
    source TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    badge_icon TEXT,
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CRIAR ÍNDICES IMPORTANTES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_training_assignments_user ON training_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_training ON training_assignments(training_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_user_date ON time_clock(user_id, date);
CREATE INDEX IF NOT EXISTS idx_disc_responses_user ON disc_responses(user_id);

-- 11. FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. CRIAR TRIGGERS PARA updated_at
-- =====================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN (
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
        GROUP BY table_name
    ) LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_' || t) THEN
            EXECUTE 'CREATE TRIGGER set_updated_at_' || t || '
                BEFORE UPDATE ON public.' || quote_ident(t) || '
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
            RAISE NOTICE 'Trigger criado para %', t;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- SCRIPT COMPLETO EXECUTADO!
-- =====================================================
SELECT 'Schema corrigido com sucesso!' AS resultado;

