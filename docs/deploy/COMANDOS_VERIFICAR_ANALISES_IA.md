# Verificar Análises de IA Incompletas

O problema é que as análises estão aparecendo apenas parcialmente (campos vazios).

## Verificar análises incompletas no banco:

```bash
cd /root/primecamp-ofc
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "
SELECT 
    job_response_id,
    CASE 
        WHEN analysis_data->>'score_geral' IS NULL OR (analysis_data->>'score_geral')::int = 0 THEN 'SEM SCORE'
        ELSE 'OK'
    END as score_status,
    CASE 
        WHEN analysis_data->>'perfil_comportamental' IS NULL OR analysis_data->>'perfil_comportamental' = '' THEN 'SEM PERFIL'
        ELSE 'OK'
    END as perfil_status,
    CASE 
        WHEN analysis_data->>'experiencia' IS NULL OR analysis_data->>'experiencia' = '' THEN 'SEM EXPERIENCIA'
        ELSE 'OK'
    END as experiencia_status
FROM job_candidate_ai_analysis
WHERE company_id = '00000000-0000-0000-0000-000000000001'
LIMIT 10;
"
```

## Solução:

Para análises incompletas, você precisa **regenerar a análise** clicando no botão "Gerar Análise" novamente no sistema.

As análises antigas podem ter sido geradas com dados parciais. A única forma de corrigir é regenerá-las.
