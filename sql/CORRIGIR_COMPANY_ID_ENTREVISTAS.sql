-- ============================================
-- CORRIGIR company_id NAS ENTREVISTAS
-- Atualiza todas as entrevistas com company_id correto baseado no job_response
-- ============================================

DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Atualizar entrevistas baseado no job_response
    UPDATE job_interviews i
    SET company_id = COALESCE(
        (SELECT jr.company_id FROM job_responses jr WHERE jr.id = i.job_response_id),
        admin_company_id
    )
    WHERE i.company_id IS NULL 
       OR i.company_id != COALESCE(
           (SELECT jr.company_id FROM job_responses jr WHERE jr.id = i.job_response_id),
           admin_company_id
       );

    RAISE NOTICE '✅ Entrevistas atualizadas com company_id correto';

    -- Verificar resultado
    RAISE NOTICE 'Total de entrevistas: %', (SELECT COUNT(*) FROM job_interviews);
    RAISE NOTICE 'Entrevistas com company_id: %', (SELECT COUNT(*) FROM job_interviews WHERE company_id IS NOT NULL);
    RAISE NOTICE 'Entrevistas sem company_id: %', (SELECT COUNT(*) FROM job_interviews WHERE company_id IS NULL);
END $$;

-- Verificar resultado final
SELECT 
    COUNT(*) as total_entrevistas,
    COUNT(*) FILTER (WHERE company_id IS NULL) as sem_company_id,
    COUNT(*) FILTER (WHERE questions IS NULL OR questions::text = '[]' OR questions::text = 'null') as sem_perguntas,
    COUNT(DISTINCT company_id) as empresas_diferentes
FROM job_interviews;
