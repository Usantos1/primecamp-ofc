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
