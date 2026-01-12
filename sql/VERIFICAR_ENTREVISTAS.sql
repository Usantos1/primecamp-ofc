-- Verificar entrevistas no banco
SELECT 
    COUNT(*) as total_entrevistas,
    COUNT(*) FILTER (WHERE company_id IS NULL) as sem_company_id,
    COUNT(*) FILTER (WHERE questions IS NULL OR questions::text = '[]') as sem_perguntas,
    COUNT(DISTINCT company_id) as empresas_diferentes
FROM job_interviews;

-- Listar algumas entrevistas
SELECT 
    id,
    job_response_id,
    survey_id,
    interview_type,
    status,
    CASE 
        WHEN questions IS NULL THEN 'NULL'
        WHEN questions::text = '[]' THEN 'VAZIO'
        ELSE 'TEM PERGUNTAS'
    END as perguntas_status,
    company_id,
    created_at
FROM job_interviews
ORDER BY created_at DESC
LIMIT 10;
