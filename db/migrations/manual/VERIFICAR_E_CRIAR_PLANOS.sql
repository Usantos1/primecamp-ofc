-- Verificar e criar planos se não existirem

-- Verificar planos existentes
SELECT 'Planos existentes:' as info;
SELECT id, name, code, price_monthly, active FROM plans ORDER BY price_monthly ASC;

-- Criar planos se não existirem
DO $$
BEGIN
    -- Plano Básico
    IF NOT EXISTS (SELECT 1 FROM plans WHERE code = 'basic') THEN
        INSERT INTO plans (name, code, price_monthly, price_yearly, max_users, max_storage_gb, max_orders_per_month, features, active)
        VALUES (
            'Básico', 
            'basic', 
            99.00, 
            990.00, 
            5, 
            10, 
            100, 
            '{"reports": true, "api": false, "custom_branding": false}'::jsonb,
            true
        );
        RAISE NOTICE 'Plano Básico criado';
    ELSE
        RAISE NOTICE 'Plano Básico já existe';
    END IF;

    -- Plano Premium
    IF NOT EXISTS (SELECT 1 FROM plans WHERE code = 'premium') THEN
        INSERT INTO plans (name, code, price_monthly, price_yearly, max_users, max_storage_gb, max_orders_per_month, features, active)
        VALUES (
            'Premium', 
            'premium', 
            299.00, 
            2990.00, 
            20, 
            50, 
            500, 
            '{"reports": true, "api": true, "custom_branding": false}'::jsonb,
            true
        );
        RAISE NOTICE 'Plano Premium criado';
    ELSE
        RAISE NOTICE 'Plano Premium já existe';
    END IF;

    -- Plano Enterprise
    IF NOT EXISTS (SELECT 1 FROM plans WHERE code = 'enterprise') THEN
        INSERT INTO plans (name, code, price_monthly, price_yearly, max_users, max_storage_gb, max_orders_per_month, features, active)
        VALUES (
            'Enterprise', 
            'enterprise', 
            799.00, 
            7990.00, 
            100, 
            200, 
            -1, 
            '{"reports": true, "api": true, "custom_branding": true, "priority_support": true}'::jsonb,
            true
        );
        RAISE NOTICE 'Plano Enterprise criado';
    ELSE
        RAISE NOTICE 'Plano Enterprise já existe';
    END IF;
END $$;

-- Verificar planos após criação
SELECT 'Planos após verificação:' as info;
SELECT id, name, code, price_monthly, active FROM plans ORDER BY price_monthly ASC;

SELECT 'Verificação concluída!' as resultado;

