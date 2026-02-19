# Caminhos e comandos da VPS – Primecamp

Caminhos corretos usados no deploy. Manter atualizado.

## Diretórios

| Uso | Caminho |
|-----|---------|
| Projeto (clone / pasta do app) | `~/primecamp-ofc` |
| Web root (nginx, arquivos estáticos) | `/var/www/primecamp.cloud/` |

## Serviços (systemd)

| Serviço | Nome |
|---------|------|
| API Node (server) | `primecamp-api` |
| Nginx | `nginx` |

## Comandos de deploy (uma linha)

```bash
cd ~/primecamp-ofc && git pull origin main && npm install && (cd server && npm install) && npm run build && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo systemctl restart primecamp-api && sudo systemctl reload nginx
```

## Git

- Remoto: `origin` → `https://github.com/Usantos1/primecamp-ofc`
- Branch principal: `main`

---

## Subir no Git (na sua máquina) e deploy na VPS

### 1. Na sua máquina – subir no Git

```bash
cd c:\Users\Uander\Documents\GitHub\primecamp
git add scripts/monitor-and-restart-api.sh server/REINICIAR-API-VPS.md docs/VPS-PATHS.md
git commit -m "Script monitor-and-restart-api + docs deploy e passos VPS"
git push origin main
```

### 2. Na VPS – deploy (passo a passo)

Conecte por SSH na VPS e rode na ordem:

**Passo 1 – Ir para a pasta do projeto e puxar o código**

```bash
cd ~/primecamp-ofc
git pull origin main
```

**Passo 2 – Instalar deps, build do front e copiar para o nginx**

```bash
npm install
cd server && npm install && cd ..
npm run build
sudo cp -r dist/* /var/www/primecamp.cloud/
```

**Passo 3 – Reiniciar API e Nginx**

- Se a API roda com **systemd**:  
  `sudo systemctl restart primecamp-api`
- Se a API roda com **PM2**:  
  `pm2 restart primecamp-api` (ou `pm2 restart all`)

**Passo 4 – Recarregar Nginx**

```bash
sudo systemctl reload nginx
```

**Passo 5 – Ativar o script que reinicia a API quando travar (opcional)**

```bash
chmod +x ~/primecamp-ofc/scripts/monitor-and-restart-api.sh
```

Testar uma vez:

```bash
~/primecamp-ofc/scripts/monitor-and-restart-api.sh
```

Para rodar o monitor a cada 2 minutos no cron:

```bash
crontab -e
```

Adicione esta linha (ajuste o caminho se não for `~/primecamp-ofc`):

```
*/2 * * * * /bin/bash ~/primecamp-ofc/scripts/monitor-and-restart-api.sh >> /var/log/primecamp-monitor.log 2>&1
```

Salve e saia. Pronto: o script vai verificar a API a cada 2 min e reiniciar só se der erro ou travar.

### Deploy em uma linha (após o primeiro setup do script)

Se já configurou o cron e o script, para os próximos deploys pode usar só:

```bash
cd ~/primecamp-ofc && git pull origin main && npm install && (cd server && npm install) && npm run build && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo systemctl restart primecamp-api && sudo systemctl reload nginx
```

(Substitua `systemctl restart primecamp-api` por `pm2 restart primecamp-api` se usar PM2.)
