-- ============================================
-- VERIFICAR E CORRIGIR company_id EM nps_surveys
-- ============================================

-- 1. Verificar se a coluna company_id existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'nps_surveys' 
            AND column_name = 'company_id'
        ) THEN '✅ Coluna company_id existe'
        ELSE '❌ Coluna company_id NÃO existe'
    END as status;

-- 2. Verificar registros sem company_id
SELECT 
    COUNT(*) as total_registros,
    COUNT(company_id) as com_company_id,
    COUNT(*) - COUNT(company_id) as sem_company_id
FROM nps_surveys;

-- 3. Se a coluna não existir, criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nps_surveys' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.nps_surveys 
        ADD COLUMN company_id UUID REFERENCES companies(id);
        
        RAISE NOTICE '✅ Coluna company_id criada em nps_surveys';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna company_id já existe em nps_surveys';
    END IF;
END $$;

-- 4. Atualizar registros sem company_id com o company_id do criador
-- (assumindo que o created_by está relacionado a um usuário que tem company_id)
UPDATE public.nps_surveys ns
SET company_id = (
    SELECT u.company_id 
    FROM users u 
    WHERE u.id = ns.created_by 
    LIMIT 1
)
WHERE ns.company_id IS NULL 
AND ns.created_by IS NOT NULL;

-- 5. Se ainda houver registros sem company_id, usar a primeira company disponível
-- (APENAS SE NECESSÁRIO - use com cuidado!)
UPDATE public.nps_surveys
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL
AND EXISTS (SELECT 1 FROM companies);

-- 6. Verificar resultado final
SELECT 
    '=== RESULTADO FINAL ===' as info;
    
SELECT 
    COUNT(*) as total,
    COUNT(company_id) as com_company_id,
    COUNT(*) - COUNT(company_id) as sem_company_id
FROM nps_surveys;

-- 7. Listar registros que ainda não têm company_id (se houver)
SELECT 
    id,
    title,
    created_by,
    created_at
FROM nps_surveys
WHERE company_id IS NULL;
