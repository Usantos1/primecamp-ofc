# Adicionar company_id em ordens_servico

## Executar no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/ADICIONAR_COMPANY_ID_ORDENS_SERVICO.sql
```

## Verificar se funcionou:

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ordens_servico' AND column_name = 'company_id';"
```

## Depois, recarregue a página no navegador (F5)
