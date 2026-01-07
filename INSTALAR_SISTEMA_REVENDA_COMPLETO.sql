-- =====================================================
-- INSTALAÇÃO COMPLETA DO SISTEMA DE REVENDA
-- Script único que cria tudo na ordem correta
-- Pode ser executado múltiplas vezes sem erro
-- =====================================================

-- =====================================================
-- PARTE 1: CRIAR TABELAS DO SISTEMA DE REVENDA
-- =====================================================

-- 1. Tabela de Empresas (Companies)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    
    -- Status da empresa
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
    trial_ends_at TIMESTAMPTZ,
    
    -- Configurações
    settings JSONB DEFAULT '{}',
    logo_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Tabela de Planos
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'basic', 'premium', 'enterprise'
    description TEXT,
    
    -- Preço
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    
    -- Limites do plano
    max_users INTEGER DEFAULT 5,
    max_storage_gb INTEGER DEFAULT 10,
    max_orders_per_month INTEGER DEFAULT 100,
    
    -- Funcionalidades (JSON com features habilitadas)
    features JSONB DEFAULT '{}',
    
    -- Status
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Verificar e corrigir tabela de Assinaturas
DO $$
BEGIN
    -- Se tabela existe mas não tem company_id, dropar e recriar
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'subscriptions' 
                       AND column_name = 'company_id') THEN
            DROP TABLE public.subscriptions CASCADE;
            RAISE NOTICE 'Tabela subscriptions removida (estava sem company_id)';
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    
    -- Período da assinatura
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment')),
    
    -- Valor
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id),
    
    -- Dados do pagamento
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    payment_method VARCHAR(50) DEFAULT 'pix',
    
    -- PIX específico
    pix_code TEXT,
    pix_qr_code TEXT,
    pix_expires_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled', 'refunded')),
    paid_at TIMESTAMPTZ,
    
    -- Dados externos (gateway)
    external_id VARCHAR(255), -- ID do gateway
    external_data JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Logs de Uso (para controle de limites)
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Tipo de uso
    resource_type VARCHAR(50) NOT NULL, -- 'user', 'order', 'storage', etc.
    resource_id UUID,
    
    -- Período
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    
    -- Contador
    count INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON public.payments(external_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_company_period ON public.usage_logs(company_id, period_year, period_month);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at_companies ON public.companies;
CREATE TRIGGER set_updated_at_companies
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_subscriptions ON public.subscriptions;
CREATE TRIGGER set_updated_at_subscriptions
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_payments ON public.payments;
CREATE TRIGGER set_updated_at_payments
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar se empresa está ativa e pagando
CREATE OR REPLACE FUNCTION check_company_active(company_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    company_status VARCHAR(20);
    subscription_status VARCHAR(20);
    subscription_expires TIMESTAMPTZ;
BEGIN
    -- Verificar status da empresa
    SELECT status INTO company_status
    FROM public.companies
    WHERE id = company_uuid AND deleted_at IS NULL;
    
    IF company_status IS NULL OR company_status IN ('cancelled', 'suspended') THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar assinatura ativa
    SELECT s.status, s.expires_at INTO subscription_status, subscription_expires
    FROM public.subscriptions s
    WHERE s.company_id = company_uuid
    AND s.status = 'active'
    ORDER BY s.expires_at DESC
    LIMIT 1;
    
    IF subscription_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se não expirou
    IF subscription_expires < NOW() THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 2: INSERIR DADOS INICIAIS
-- =====================================================

-- Inserir empresa admin (ID fixo conhecido)
INSERT INTO public.companies (id, name, email, status, cnpj)
VALUES ('00000000-0000-0000-0000-000000000001', 'Prime Camp Admin', 'admin@primecamp.cloud', 'active', '00.000.000/0001-00')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, email = EXCLUDED.email, status = EXCLUDED.status;

-- Inserir planos padrão
INSERT INTO public.plans (name, code, price_monthly, price_yearly, max_users, max_storage_gb, max_orders_per_month, features)
VALUES
    ('Básico', 'basic', 99.00, 990.00, 5, 10, 100, '{"reports": true, "api": false, "custom_branding": false}'::jsonb),
    ('Premium', 'premium', 299.00, 2990.00, 20, 50, 500, '{"reports": true, "api": true, "custom_branding": false}'::jsonb),
    ('Enterprise', 'enterprise', 799.00, 7990.00, 100, 200, -1, '{"reports": true, "api": true, "custom_branding": true, "priority_support": true}'::jsonb)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, 
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_users = EXCLUDED.max_users,
    max_storage_gb = EXCLUDED.max_storage_gb,
    max_orders_per_month = EXCLUDED.max_orders_per_month,
    features = EXCLUDED.features;

-- Criar assinatura para empresa admin (ilimitada)
DO $$
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
    enterprise_plan_id UUID;
    existing_subscription UUID;
BEGIN
    -- Buscar ID do plano enterprise
    SELECT id INTO enterprise_plan_id
    FROM public.plans
    WHERE code = 'enterprise'
    LIMIT 1;
    
    -- Verificar se já existe assinatura ativa
    SELECT id INTO existing_subscription
    FROM public.subscriptions
    WHERE company_id = admin_company_id
    AND plan_id = enterprise_plan_id
    AND status = 'active'
    LIMIT 1;
    
    -- Inserir apenas se não existir
    IF enterprise_plan_id IS NOT NULL AND existing_subscription IS NULL THEN
        INSERT INTO public.subscriptions (company_id, plan_id, billing_cycle, expires_at, amount, status)
        VALUES (
            admin_company_id,
            enterprise_plan_id,
            'yearly',
            NOW() + INTERVAL '100 years',
            0,
            'active'
        );
        RAISE NOTICE 'Assinatura criada para empresa admin';
    ELSE
        RAISE NOTICE 'Assinatura já existe ou plano não encontrado';
    END IF;
END $$;

-- =====================================================
-- PARTE 3: ADICIONAR company_id NAS TABELAS EXISTENTES
-- =====================================================

DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    RAISE NOTICE 'Iniciando migração de company_id...';
    
    -- Tabela de usuários
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'users' AND column_name = 'company_id') THEN
            ALTER TABLE public.users ADD COLUMN company_id UUID;
            UPDATE public.users SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.users ADD CONSTRAINT fk_users_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.users ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em users';
        ELSE
            RAISE NOTICE 'Coluna company_id já existe em users';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela users não existe, pulando...';
    END IF;

    -- Tabela de produtos
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'produtos') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'produtos' AND column_name = 'company_id') THEN
            ALTER TABLE public.produtos ADD COLUMN company_id UUID;
            UPDATE public.produtos SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.produtos ADD CONSTRAINT fk_produtos_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.produtos ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_produtos_company_id ON public.produtos(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em produtos';
        ELSE
            RAISE NOTICE 'Coluna company_id já existe em produtos';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela produtos não existe, pulando...';
    END IF;

    -- Tabela de ordens de serviço
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'ordens_servico') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'ordens_servico' AND column_name = 'company_id') THEN
            ALTER TABLE public.ordens_servico ADD COLUMN company_id UUID;
            UPDATE public.ordens_servico SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.ordens_servico ADD CONSTRAINT fk_ordens_servico_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.ordens_servico ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_ordens_servico_company_id ON public.ordens_servico(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em ordens_servico';
        ELSE
            RAISE NOTICE 'Coluna company_id já existe em ordens_servico';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela ordens_servico não existe, pulando...';
    END IF;

    -- Tabela de clientes
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'clientes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'clientes' AND column_name = 'company_id') THEN
            ALTER TABLE public.clientes ADD COLUMN company_id UUID;
            UPDATE public.clientes SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.clientes ADD CONSTRAINT fk_clientes_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.clientes ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_clientes_company_id ON public.clientes(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em clientes';
        ELSE
            RAISE NOTICE 'Coluna company_id já existe em clientes';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela clientes não existe, pulando...';
    END IF;

    -- Tabela de time_clock
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'time_clock') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'time_clock' AND column_name = 'company_id') THEN
            ALTER TABLE public.time_clock ADD COLUMN company_id UUID;
            UPDATE public.time_clock SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.time_clock ADD CONSTRAINT fk_time_clock_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.time_clock ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_time_clock_company_id ON public.time_clock(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em time_clock';
        ELSE
            RAISE NOTICE 'Coluna company_id já existe em time_clock';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela time_clock não existe, pulando...';
    END IF;

    -- Tabela de vendas/caixa
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'vendas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public'
                       AND table_name = 'vendas' AND column_name = 'company_id') THEN
            ALTER TABLE public.vendas ADD COLUMN company_id UUID;
            UPDATE public.vendas SET company_id = admin_company_id WHERE company_id IS NULL;
            ALTER TABLE public.vendas ADD CONSTRAINT fk_vendas_company 
                FOREIGN KEY (company_id) REFERENCES public.companies(id);
            ALTER TABLE public.vendas ALTER COLUMN company_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_vendas_company_id ON public.vendas(company_id);
            RAISE NOTICE 'Coluna company_id adicionada em vendas';
        ELSE
            RAISE NOTICE 'Coluna company_id já existe em vendas';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela vendas não existe, pulando...';
    END IF;
    
    RAISE NOTICE 'Migração de company_id concluída!';
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
    'Empresas' as tabela, COUNT(*) as registros FROM companies
UNION ALL
SELECT 'Planos', COUNT(*) FROM plans
UNION ALL
SELECT 'Assinaturas', COUNT(*) FROM subscriptions;

SELECT 'Sistema de revenda instalado com sucesso!' AS resultado;

