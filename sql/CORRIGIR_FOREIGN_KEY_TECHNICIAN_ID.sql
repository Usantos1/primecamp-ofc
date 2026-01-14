-- ============================================
-- CORRIGIR FOREIGN KEY CONSTRAINT DE technician_id
-- ============================================
-- A constraint atual aponta para auth.users, mas o sistema usa public.users
-- Este script corrige a constraint para apontar para public.users
-- ============================================

-- 1. VERIFICAR A CONSTRAINT ATUAL
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.sales'::regclass
    AND conname = 'sales_technician_id_fkey';

-- 2. DROPAR A CONSTRAINT ANTIGA (aponta para auth.users)
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_technician_id_fkey;

-- 3. CRIAR NOVA CONSTRAINT APONTANDO PARA public.users
ALTER TABLE public.sales
ADD CONSTRAINT sales_technician_id_fkey 
FOREIGN KEY (technician_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- 4. VERIFICAR A NOVA CONSTRAINT
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.sales'::regclass
    AND conname = 'sales_technician_id_fkey';

-- 5. VERIFICAR SE HÁ VENDAS COM technician_id INVÁLIDO (OPCIONAL - para diagnóstico)
SELECT 
    COUNT(*) as total_vendas_com_technician_id,
    COUNT(u.id) as vendas_com_usuario_valido,
    COUNT(*) - COUNT(u.id) as vendas_com_usuario_invalido
FROM public.sales s
LEFT JOIN public.users u ON s.technician_id = u.id
WHERE s.technician_id IS NOT NULL;
