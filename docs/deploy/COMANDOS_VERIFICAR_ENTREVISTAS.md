# Verificar Entrevistas no Banco

Execute para ver se as entrevistas estão no banco e se têm company_id:

```bash
cd /root/primecamp-ofc
git pull origin main
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/VERIFICAR_ENTREVISTAS.sql
```

Isso vai mostrar:
- Total de entrevistas
- Quantas estão sem company_id
- Quantas estão sem perguntas
- Lista de algumas entrevistas recentes

Se as entrevistas estiverem no banco mas sem company_id ou com company_id incorreto, precisamos corrigir.
