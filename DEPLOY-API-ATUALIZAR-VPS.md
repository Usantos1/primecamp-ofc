# Deploy completo: Frontend + API

O erro **"Vendas de OS devem ter technician_id"** vem da **API** (backend Node em `server/index.js`), **não** do frontend.  
A **API** precisa estar com o código novo e ser reiniciada.

---

## 1. Atualizar código na VPS (na pasta do projeto da API)

```bash
cd ~/primecamp-ofc
git fetch origin
git log -1 --oneline origin/main
git reset --hard origin/main
```

(Se `git pull` disser "Already up to date" mas o erro continuar, use `git fetch` + `git reset --hard origin/main` para forçar o mesmo estado do GitHub.)

**Conferir se a correção está no arquivo (na VPS):**
```bash
grep "technician_id é opcional" server/index.js
```
Se aparecer uma linha com "technician_id é opcional (adiantamento sem técnico permitido)", o código está certo.  
Se aparecer "Vendas de OS devem ter technician_id", o código ainda é o antigo — confira o `git remote` e o branch.

---

## 2. Deploy do FRONTEND (site estático)

```bash
npm run build
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo systemctl reload nginx
```

---

## 3. Reiniciar a API (obrigatório para o erro sumir)

A API é o servidor Node que atende `api.primecamp.cloud` (ou a URL que o frontend usa).  
Ela roda a partir de `server/index.js`. Depois do `git pull`, esse processo precisa ser reiniciado.

### Se você usa PM2

```bash
cd ~/primecamp-ofc
pm2 list
pm2 restart all
```

Ou, se a API tiver um nome específico (ex.: `api` ou `primecamp-api`):

```bash
pm2 restart api
```

### Se a API roda com systemd

```bash
sudo systemctl restart primecamp-api
# ou o nome exato do serviço (ex.: api.primecamp)
```

### Se você sobe a API manualmente (node ou npm)

1. Pare o processo atual (Ctrl+C no terminal onde está rodando, ou mate o processo).
2. Suba de novo:

```bash
cd ~/primecamp-ofc
node server/index.js
# ou: npm run server
```

(Recomendação: usar **pm2** para manter a API rodando e reiniciar com `pm2 restart all`.)

---

## Resumo

| O que você rodou              | O que atualiza      |
|------------------------------|---------------------|
| `npm run build` + `cp dist/*` | Só o **frontend**   |
| Reiniciar a API (pm2/systemd/node) | **Backend** (onde está a correção do technician_id) |

Sem reiniciar a API, o erro continua em **local e produção**, porque ambos usam a mesma API (api.primecamp.cloud).

---

## Conferir se a API está no mesmo servidor

```bash
pm2 list
# ou
sudo systemctl list-units --type=service | grep -E 'primecamp|api|node'
```

Se a API estiver em **outro servidor**, faça `git pull` e reinício da API **nesse outro servidor**.
