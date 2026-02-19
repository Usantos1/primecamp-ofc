# Como reiniciar a API na VPS

Reiniciar a API **zera o contador de tentativas de login** (rate limit em memória) e libera o login de novo. O limite é 2500 tentativas de login por IP a cada 15 minutos.

---

## 0. Script de monitoramento (reinício automático)

Para **reiniciar a API só quando der erro ou travar** (em vez de `pm2 restart all` manual):

- **Uma verificação:** `./scripts/monitor-and-restart-api.sh`
- **Loop a cada 2 min:** `./scripts/monitor-and-restart-api.sh --loop`
- **Cron (recomendado na VPS):** adicione `*/2 * * * * /bin/bash ~/primecamp-ofc/scripts/monitor-and-restart-api.sh >> /var/log/primecamp-monitor.log 2>&1`

O script verifica o status do PM2 (errored/stopped) e o endpoint `/api/health`; se falhar ou não responder em 15s, faz `pm2 restart primecamp-api` (com cooldown de 2 min entre restarts).

---

## 1. Se você usa **PM2** (recomendado)

Conecte na VPS por SSH e rode:

```bash
# Ver processos
pm2 list

# Reiniciar todos
pm2 restart all

# OU reiniciar só a API (nome do app, ex: primecamp-api ou index)
pm2 restart primecamp-api
# ou
pm2 restart index
```

Para ver o nome exato do app: `pm2 list` e use a coluna **name**.

---

## 2. Se a API roda como **serviço (systemd)**

```bash
# Nome do serviço pode ser: primecamp-api, api, node-api, etc.
sudo systemctl restart primecamp-api
```

Para achar o nome do serviço:

```bash
sudo systemctl list-units --type=service | grep -i prime
# ou
sudo systemctl list-units --type=service | grep -i node
```

---

## 3. Se a API foi iniciada com **node** direto (nohup/screen)

```bash
# Achar o processo da API (node index.js ou similar)
ps aux | grep "node.*index"

# Matar pelo PID (troque 12345 pelo número que aparecer)
kill 12345

# Entrar na pasta da API e subir de novo
cd /caminho/para/primecamp/server
node index.js
# Ou com nohup para rodar em background:
nohup node index.js > api.log 2>&1 &
```

---

## 4. Se usa **Docker**

```bash
docker ps
docker restart <ID ou NOME do container da API>
```

---

## Depois de reiniciar

1. Espere uns 10–20 segundos.
2. Tente fazer login de novo no sistema (front).
3. O bloqueio de “muitas tentativas” deve sumir.

Se ainda der erro, confira os logs:

- **PM2:** `pm2 logs`
- **systemd:** `sudo journalctl -u primecamp-api -f`
- **Docker:** `docker logs -f <container>`
