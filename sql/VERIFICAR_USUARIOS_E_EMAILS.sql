-- ============================================
-- VERIFICAR USUÁRIOS E EMAILS
-- ============================================

-- 1. CONTAR TOTAL DE USUÁRIOS
SELECT 
    'Total de usuários' as tipo,
    COUNT(*) as total
FROM public.users;

-- 2. CONTAR USUÁRIOS POR company_id
SELECT 
    COALESCE(c.name, 'SEM EMPRESA') as empresa,
    COUNT(*) as total_usuarios
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
GROUP BY c.id, c.name
ORDER BY total_usuarios DESC;

-- 3. VERIFICAR SE O EMAIL "natalia@primecamp.com.br" JÁ EXISTE
SELECT 
    'Verificação de email' as tipo,
    id,
    email,
    company_id,
    created_at,
    CASE 
        WHEN email = 'natalia@primecamp.com.br' THEN '✅ EXISTE'
        ELSE 'N/A'
    END as status
FROM public.users
WHERE email = 'natalia@primecamp.com.br';

-- 4. LISTAR TODOS OS USUÁRIOS (útil para ver o que está no banco)
SELECT 
    u.id,
    u.email,
    u.company_id,
    c.name as empresa,
    p.display_name,
    p.role,
    u.created_at
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
LEFT JOIN public.profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC
LIMIT 50;

-- 5. VERIFICAR USUÁRIOS SEM company_id
SELECT 
    'Usuários sem company_id' as tipo,
    COUNT(*) as total
FROM public.users
WHERE company_id IS NULL;

-- 6. VERIFICAR DUPLICATAS DE EMAIL (não deveria haver se a constraint UNIQUE estiver funcionando)
SELECT 
    email,
    COUNT(*) as total
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;
