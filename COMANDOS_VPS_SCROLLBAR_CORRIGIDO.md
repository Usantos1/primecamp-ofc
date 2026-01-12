# Comandos VPS - Deploy Scrollbar (CORRIGIDO)

## Problema:
Script estava tentando remover arquivos do sistema. Agora está corrigido.

## Comandos MANUAIS (se o script não funcionar):

```bash
# Você já está no diretório ~/primecamp-ofc, então:

# 1. Atualizar código
git pull origin main

# 2. Build
npm run build

# 3. Definir diretório Nginx (ajuste conforme seu servidor)
NGINX_ROOT="/var/www/primecamp.cloud"

# 4. Deploy
rm -rf "$NGINX_ROOT"/* 2>/dev/null
cp -r dist/* "$NGINX_ROOT"/
chown -R www-data:www-data "$NGINX_ROOT"
chmod -R 755 "$NGINX_ROOT"

# 5. Limpar cache nginx (opcional)
rm -rf /var/cache/nginx/* 2>/dev/null
systemctl reload nginx
```

## Se os comandos não funcionarem:

Tente com caminhos completos:

```bash
/usr/bin/git pull origin main
/usr/bin/npm run build

NGINX_ROOT="/var/www/primecamp.cloud"
rm -rf "$NGINX_ROOT"/* 2>/dev/null
cp -r dist/* "$NGINX_ROOT"/
/usr/bin/chown -R www-data:www-data "$NGINX_ROOT"
/usr/bin/chmod -R 755 "$NGINX_ROOT"

# Recarregar nginx
/bin/systemctl reload nginx
```

## Verificar diretório Nginx:

```bash
# Verificar qual diretório o nginx usa
grep -r "root " /etc/nginx/sites-enabled/*.conf 2>/dev/null | head -1

# Ou verificar se existe
ls -la /var/www/primecamp.cloud
ls -la /var/www/html
```
