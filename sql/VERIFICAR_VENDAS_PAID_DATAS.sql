-- ============================================
-- VERIFICAR VENDAS PAID E SUAS DATAS
-- Para diagnosticar por que o dashboard está zerado
-- ============================================

-- 1. VERIFICAR VENDAS PAID - QUANTIDADE E DATAS
SELECT 
    'Vendas PAID' as tipo,
    COUNT(*) as quantidade,
    MIN(created_at) as data_mais_antiga,
    MAX(created_at) as data_mais_recente,
    SUM(total) as total_geral,
    SUM(total_pago) as total_pago_geral
FROM public.sales
WHERE status = 'paid';

-- 2. VERIFICAR VENDAS PAID DO DIA DE HOJE
SELECT 
    'Vendas PAID hoje' as tipo,
    COUNT(*) as quantidade,
    SUM(total) as total,
    SUM(total_pago) as total_pago,
    DATE(created_at) as data_venda
FROM public.sales
WHERE status = 'paid'
  AND DATE(created_at) = CURRENT_DATE
GROUP BY DATE(created_at);

-- 3. VERIFICAR VENDAS PAID DO MÊS ATUAL
SELECT 
    'Vendas PAID mês atual' as tipo,
    COUNT(*) as quantidade,
    SUM(total) as total,
    SUM(total_pago) as total_pago,
    DATE_TRUNC('month', created_at) as mes
FROM public.sales
WHERE status = 'paid'
  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', created_at);

-- 4. VERIFICAR VENDAS PAID DOS ÚLTIMOS 30 DIAS (por dia)
SELECT 
    DATE(created_at) as data_venda,
    COUNT(*) as quantidade,
    SUM(total) as total,
    SUM(total_pago) as total_pago
FROM public.sales
WHERE status = 'paid'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY data_venda DESC;

-- 5. VERIFICAR COMPANY_ID DAS VENDAS PAID
SELECT 
    company_id,
    COUNT(*) as quantidade,
    MIN(created_at) as data_mais_antiga,
    MAX(created_at) as data_mais_recente,
    SUM(total) as total
FROM public.sales
WHERE status = 'paid'
GROUP BY company_id
ORDER BY quantidade DESC;

-- 6. LISTAR ÚLTIMAS 10 VENDAS PAID (com datas e company_id)
SELECT 
    id,
    numero,
    total,
    total_pago,
    status,
    company_id,
    DATE(created_at) as data_venda,
    created_at as data_completa
FROM public.sales
WHERE status = 'paid'
ORDER BY created_at DESC
LIMIT 10;

-- 7. VERIFICAR DATAS EM FORMATO ISO (como o código usa)
SELECT 
    'Data atual (agora)' as tipo,
    NOW()::text as valor,
    DATE(NOW()) as data_hoje,
    DATE_TRUNC('month', NOW()) as inicio_mes,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day' as fim_mes;

-- 8. VERIFICAR VENDAS PAID COM DATAS ISO (comparar com períodos do código)
SELECT 
    id,
    numero,
    total,
    status,
    company_id,
    created_at::text as created_at_iso,
    DATE(created_at) as data_venda,
    CASE 
        WHEN DATE(created_at) = CURRENT_DATE THEN '✅ DIA ATUAL'
        WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN '✅ MÊS ATUAL'
        ELSE '❌ FORA DO PERÍODO'
    END as periodo_status
FROM public.sales
WHERE status = 'paid'
ORDER BY created_at DESC
LIMIT 20;
