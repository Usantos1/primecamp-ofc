# Corrigir API em "errored" no PM2

Se `pm2 show primecamp-api` mostra **status: errored**, a API não está rodando e as requisições falham.

## 1. Ver por que a API está caindo

```bash
pm2 logs primecamp-api --err --lines 80
```

Procure a última mensagem de erro (ex.: missing .env, ECONNREFUSED no banco, porta em uso, etc.).

## 2. Rodar a API com cwd na raiz do projeto

O PM2 estava com **exec cwd** em `/root/primecamp-ofc/server`. O ideal é a raiz do projeto.

```bash
cd /root/primecamp-ofc

# Remover o processo atual
pm2 delete primecamp-api

# Subir de novo a partir da RAIZ (assim o script path é relativo e o .env fica no lugar certo)
pm2 start server/index.js --name primecamp-api

# Verificar
pm2 list
pm2 show primecamp-api
```

O **exec cwd** deve aparecer como `/root/primecamp-ofc`.

## 3. Se ainda ficar "errored"

- Confira se o arquivo `.env` existe na raiz: `ls -la /root/primecamp-ofc/.env`
- Confira as variáveis que a API precisa (DB, PORT, etc.) e se o banco está acessível.
- Rode a API manualmente para ver o erro no terminal:
  ```bash
  cd /root/primecamp-ofc
  node server/index.js
  ```
  O que aparecer no console é a causa do crash.

## 4. Salvar a lista do PM2 (opcional)

Depois que a API estiver **online**:

```bash
pm2 save
pm2 startup
```

Assim a API sobe de novo após reboot do servidor.
