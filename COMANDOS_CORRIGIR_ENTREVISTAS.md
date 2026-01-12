# Corrigir company_id nas Entrevistas

## Problema
As entrevistas sumiram ou não aparecem porque têm `company_id` NULL ou incorreto após a migração.

## Solução

Execute este comando no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/CORRIGIR_COMPANY_ID_ENTREVISTAS.sql
```

Este script:
- Atualiza todas as entrevistas (`job_interviews`) com o `company_id` correto baseado no `job_response` relacionado
- Usa o `company_id` do `job_response` como referência

**Depois de executar:**
1. Recarregue a página no navegador (F5 ou Ctrl+Shift+R)
2. As entrevistas devem aparecer novamente
3. As perguntas geradas devem estar lá também

## Para verificar antes (opcional):

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/VERIFICAR_ENTREVISTAS.sql
```
