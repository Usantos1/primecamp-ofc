# Atualizar VPS (depois do git push)

Use estes passos **na VPS** (SSH no servidor). Banco: **PostgreSQL na VPS** (não Supabase).

## Deploy rápido (frontend)

```bash
cd ~/primecamp-ofc && git pull origin main && npm install && npm run build && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo systemctl reload nginx
```

Ou passo a passo:

## 1. Atualizar código

```bash
cd ~/primecamp-ofc
git pull origin main
```

(Se tiver alterações locais que não quer manter: `git fetch origin && git reset --hard origin/main`)

## 2. Frontend (site estático)

```bash
npm install
npm run build
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo systemctl reload nginx
```

## 3. Reiniciar a API (se houver)

**Com PM2:**
```bash
cd ~/primecamp-ofc
pm2 restart all
```

**Com systemd:**
```bash
sudo systemctl restart primecamp-api
```

---

## Banco de dados (PostgreSQL na VPS)

Scripts SQL (ex.: `CRIAR_TABELA_OS_PAGAMENTOS.sql`, `ALTER_OS_PAGAMENTOS_SALE_ID_NULLABLE.sql`) devem ser executados no **PostgreSQL da VPS** (psql ou cliente tipo DBeaver), não em Supabase.
