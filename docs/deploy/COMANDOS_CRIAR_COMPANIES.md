# Comandos para Criar Tabela Companies

## Executar no VPS:

```bash
cd /root/primecamp-ofc
git pull origin main
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/CRIAR_TABELA_COMPANIES.sql
```

## Verificar se funcionou:

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT id, name, status FROM companies WHERE id = '00000000-0000-0000-0000-000000000001';"
```

## Depois, no navegador:

1. Abra o Console (F12)
2. Execute: `localStorage.clear(); sessionStorage.clear(); location.reload();`
3. Faça login novamente

Os dados devem aparecer agora!
