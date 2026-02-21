-- =====================================================
-- CORREÇÃO DAS TABELAS DE REVENDA
-- Adiciona colunas faltantes em plans e payments
-- =====================================================

-- ═══════════════════════════════════════════════════════
-- TABELA PLANS - Adicionar colunas de limites
-- ═══════════════════════════════════════════════════════

-- Verificar e adicionar max_users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'max_users') THEN
        ALTER TABLE plans ADD COLUMN max_users INTEGER DEFAULT 5;
        RAISE NOTICE 'Coluna max_users adicionada à tabela plans';
    ELSE
        RAISE NOTICE 'Coluna max_users já existe em plans';
    END IF;
END $$;

-- Verificar e adicionar max_products
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'max_products') THEN
        ALTER TABLE plans ADD COLUMN max_products INTEGER DEFAULT 1000;
        RAISE NOTICE 'Coluna max_products adicionada à tabela plans';
    ELSE
        RAISE NOTICE 'Coluna max_products já existe em plans';
    END IF;
END $$;

-- Verificar e adicionar max_orders
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'max_orders') THEN
        ALTER TABLE plans ADD COLUMN max_orders INTEGER DEFAULT 500;
        RAISE NOTICE 'Coluna max_orders adicionada à tabela plans';
    ELSE
        RAISE NOTICE 'Coluna max_orders já existe em plans';
    END IF;
END $$;

-- Verificar e adicionar features (JSON array)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'features') THEN
        ALTER TABLE plans ADD COLUMN features JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Coluna features adicionada à tabela plans';
    ELSE
        RAISE NOTICE 'Coluna features já existe em plans';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- TABELA PAYMENTS - Adicionar colunas faltantes
-- ═══════════════════════════════════════════════════════

-- Verificar e adicionar subscription_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'subscription_id') THEN
        ALTER TABLE payments ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
        RAISE NOTICE 'Coluna subscription_id adicionada à tabela payments';
    ELSE
        RAISE NOTICE 'Coluna subscription_id já existe em payments';
    END IF;
END $$;

-- Verificar e adicionar pix_code
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'pix_code') THEN
        ALTER TABLE payments ADD COLUMN pix_code TEXT;
        RAISE NOTICE 'Coluna pix_code adicionada à tabela payments';
    ELSE
        RAISE NOTICE 'Coluna pix_code já existe em payments';
    END IF;
END $$;

-- Verificar e adicionar pix_qr_code
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'pix_qr_code') THEN
        ALTER TABLE payments ADD COLUMN pix_qr_code TEXT;
        RAISE NOTICE 'Coluna pix_qr_code adicionada à tabela payments';
    ELSE
        RAISE NOTICE 'Coluna pix_qr_code já existe em payments';
    END IF;
END $$;

-- Verificar e adicionar expires_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'expires_at') THEN
        ALTER TABLE payments ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Coluna expires_at adicionada à tabela payments';
    ELSE
        RAISE NOTICE 'Coluna expires_at já existe em payments';
    END IF;
END $$;

-- Verificar e adicionar paid_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'paid_at') THEN
        ALTER TABLE payments ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Coluna paid_at adicionada à tabela payments';
    ELSE
        RAISE NOTICE 'Coluna paid_at já existe em payments';
    END IF;
END $$;

-- Verificar e adicionar description
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'description') THEN
        ALTER TABLE payments ADD COLUMN description TEXT;
        RAISE NOTICE 'Coluna description adicionada à tabela payments';
    ELSE
        RAISE NOTICE 'Coluna description já existe em payments';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- ATUALIZAR PLANOS EXISTENTES COM VALORES PADRÃO
-- ═══════════════════════════════════════════════════════

-- Plano Básico
UPDATE plans SET 
    max_users = 3,
    max_products = 500,
    max_orders = 100,
    features = '["Suporte por email", "Relatórios básicos"]'::jsonb
WHERE code = 'basic' AND (max_users IS NULL OR max_products IS NULL);

-- Plano Profissional
UPDATE plans SET 
    max_users = 10,
    max_products = 5000,
    max_orders = 500,
    features = '["Suporte prioritário", "Relatórios avançados", "API de integração"]'::jsonb
WHERE code = 'professional' AND (max_users IS NULL OR max_products IS NULL);

-- Plano Enterprise
UPDATE plans SET 
    max_users = 999999,
    max_products = 999999,
    max_orders = 999999,
    features = '["Suporte 24/7", "Relatórios personalizados", "API ilimitada", "Gerente de conta"]'::jsonb
WHERE code = 'enterprise' AND (max_users IS NULL OR max_products IS NULL);

-- ═══════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════

SELECT 'Colunas da tabela PLANS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'plans'
ORDER BY ordinal_position;

SELECT 'Colunas da tabela PAYMENTS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

SELECT 'Planos cadastrados:' as info;
SELECT id, name, code, max_users, max_products, max_orders, price_monthly FROM plans;

