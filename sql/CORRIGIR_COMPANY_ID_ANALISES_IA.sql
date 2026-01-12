-- ============================================
-- CORRIGIR company_id NAS ANÁLISES DE IA
-- Atualiza todas as análises de IA com company_id correto baseado no job_response
-- ============================================

DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Atualizar análises de IA baseado no job_response
    UPDATE job_candidate_ai_analysis a
    SET company_id = COALESCE(
        (SELECT jr.company_id FROM job_responses jr WHERE jr.id = a.job_response_id),
        admin_company_id
    )
    WHERE a.company_id IS NULL 
       OR a.company_id != COALESCE(
           (SELECT jr.company_id FROM job_responses jr WHERE jr.id = a.job_response_id),
           admin_company_id
       );

    RAISE NOTICE '✅ Análises de IA atualizadas com company_id correto';

    -- Atualizar avaliações de candidatos também
    UPDATE job_candidate_evaluations e
    SET company_id = COALESCE(
        (SELECT jr.company_id FROM job_responses jr WHERE jr.id = e.job_response_id),
        admin_company_id
    )
    WHERE e.company_id IS NULL 
       OR e.company_id != COALESCE(
           (SELECT jr.company_id FROM job_responses jr WHERE jr.id = e.job_response_id),
           admin_company_id
       );

    RAISE NOTICE '✅ Avaliações de candidatos atualizadas com company_id correto';
END $$;

-- Verificar resultado
SELECT 
    COUNT(*) as total_analises,
    COUNT(DISTINCT company_id) as empresas_diferentes,
    COUNT(*) FILTER (WHERE company_id IS NULL) as sem_company_id
FROM job_candidate_ai_analysis;
