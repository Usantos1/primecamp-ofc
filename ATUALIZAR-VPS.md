# Atualizar VPS (depois do git push)

Use estes passos **na VPS** (SSH no servidor).

## 1. Atualizar código do repositório

```bash
cd ~/primecamp-ofc
git fetch origin
git log -1 --oneline origin/main
git reset --hard origin/main
```

## 2. Frontend (site estático)

```bash
npm install
npm run build
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo systemctl reload nginx
```

## 3. Reiniciar a API

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

## Banco de dados (Supabase) – só se precisar

Se a tabela `os_pagamentos` ainda não existir no Supabase:

1. Acesse o **Supabase** do projeto → **SQL Editor**
2. Abra o arquivo `CRIAR_TABELA_OS_PAGAMENTOS.sql` e copie todo o conteúdo
3. Cole no SQL Editor e execute (Run)

Isso é feito no **painel do Supabase**, não na VPS.
