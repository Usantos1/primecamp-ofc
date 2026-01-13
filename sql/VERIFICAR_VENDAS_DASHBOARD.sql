-- ============================================
-- VERIFICAR VENDAS PARA O DASHBOARD
-- Execute este script para investigar por que o dashboard está zerado
-- ============================================

-- 1. VERIFICAR TOTAL DE VENDAS
SELECT 
    'Total de vendas' as tipo,
    COUNT(*) as quantidade,
    SUM(total) as total_geral
FROM public.sales;

-- 2. VERIFICAR VENDAS POR STATUS
SELECT 
    status,
    COUNT(*) as quantidade,
    SUM(total) as total
FROM public.sales
GROUP BY status
ORDER BY quantidade DESC;

-- 3. VERIFICAR VENDAS DO DIA DE HOJE
SELECT 
    'Vendas do dia' as tipo,
    COUNT(*) as quantidade,
    SUM(total) as total,
    SUM(total_pago) as total_pago
FROM public.sales
WHERE DATE(created_at) = CURRENT_DATE;

-- 4. VERIFICAR VENDAS DO MÊS ATUAL
SELECT 
    'Vendas do mês' as tipo,
    COUNT(*) as quantidade,
    SUM(total) as total,
    SUM(total_pago) as total_pago
FROM public.sales
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

-- 5. VERIFICAR VENDAS COM STATUS 'paid' ou 'partial' (o que o dashboard busca)
SELECT 
    'Vendas paid/partial' as tipo,
    COUNT(*) as quantidade,
    SUM(total) as total,
    SUM(total_pago) as total_pago
FROM public.sales
WHERE status IN ('paid', 'partial');

-- 6. VERIFICAR VENDAS DO DIA COM STATUS 'paid' ou 'partial'
SELECT 
    'Vendas do dia paid/partial' as tipo,
    COUNT(*) as quantidade,
    SUM(total) as total,
    SUM(total_pago) as total_pago
FROM public.sales
WHERE status IN ('paid', 'partial')
  AND DATE(created_at) = CURRENT_DATE;

-- 7. VERIFICAR VENDAS DO MÊS COM STATUS 'paid' ou 'partial'
SELECT 
    'Vendas do mês paid/partial' as tipo,
    COUNT(*) as quantidade,
    SUM(total) as total,
    SUM(total_pago) as total_pago
FROM public.sales
WHERE status IN ('paid', 'partial')
  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

-- 8. LISTAR ÚLTIMAS 10 VENDAS (para ver status real)
SELECT 
    id,
    numero,
    total,
    total_pago,
    status,
    created_at,
    company_id,
    DATE(created_at) as data_venda
FROM public.sales
ORDER BY created_at DESC
LIMIT 10;

-- 9. VERIFICAR DISTRIBUIÇÃO DE STATUS DAS ÚLTIMAS VENDAS
SELECT 
    status,
    COUNT(*) as quantidade
FROM public.sales
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status
ORDER BY quantidade DESC;

-- 10. VERIFICAR COMPANY_ID DAS VENDAS (para ver se há isolamento)
SELECT 
    company_id,
    COUNT(*) as quantidade,
    COUNT(DISTINCT status) as status_distintos,
    STRING_AGG(DISTINCT status, ', ') as status_existentes
FROM public.sales
GROUP BY company_id
ORDER BY quantidade DESC;
