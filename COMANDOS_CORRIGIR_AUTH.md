# Comandos para Corrigir Autenticação 403

## 1. Atualizar código e reiniciar backend:

```bash
cd /root/primecamp-ofc
git pull origin main
cd server
pm2 restart primecamp-api
sleep 3
pm2 logs primecamp-api --lines 10 --nostream
```

## 2. Executar migração SQL para adicionar coluna company_id:

```bash
cd /root/primecamp-ofc
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/ADICIONAR_COMPANY_ID_USERS.sql
```

## 3. Verificar se a coluna foi adicionada:

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id';"
```

## 4. Verificar logs do backend após reiniciar:

```bash
pm2 logs primecamp-api --err --lines 20 --nostream | grep -i "auth\|jwt\|token"
```

## 5. Testar no navegador:

1. Abra o Console (F12)
2. Execute: `localStorage.clear(); sessionStorage.clear(); location.reload();`
3. Faça login novamente

---

## Comandos em sequência (copiar e colar tudo):

```bash
cd /root/primecamp-ofc && git pull origin main && cd server && pm2 restart primecamp-api && sleep 5 && pm2 logs primecamp-api --lines 10 --nostream
```

```bash
cd /root/primecamp-ofc && PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -f sql/ADICIONAR_COMPANY_ID_USERS.sql
```

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id';"
```
