# Corrigir company_id nas Análises de IA

## Problema
As análises de IA foram criadas antes da migração de `company_id`, então algumas podem ter `company_id` NULL ou incorreto, fazendo com que não apareçam no sistema.

## Solução

Execute este comando no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/CORRIGIR_COMPANY_ID_ANALISES_IA.sql
```

Este script:
- Atualiza todas as análises de IA (`job_candidate_ai_analysis`) com o `company_id` correto baseado no `job_response` relacionado
- Atualiza todas as avaliações de candidatos (`job_candidate_evaluations`) também
- Usa o `company_id` do `job_response` como referência

**Depois de executar:**
1. Recarregue a página no navegador (F5 ou Ctrl+Shift+R)
2. As análises de IA devem aparecer novamente
3. Tente gerar perguntas novamente
