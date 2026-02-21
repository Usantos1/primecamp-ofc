# Comandos VPS - Deploy Scrollbar (CORRIGIDO)

## ⚠️ IMPORTANTE: Use a rota CORRETA!
- ✅ **NOVO:** `https://primecamp.cloud/financeiro` (com filtros de data e scrollbar)
- ❌ **ANTIGO:** `https://primecamp.cloud/admin/financeiro` (sem filtros)

## Deploy Completo (RECOMENDADO):

```bash
# 1. IR PARA O DIRETÓRIO DO PROJETO
cd /root/primecamp-ofc

# 2. Atualizar código
git pull origin main

# 3. Build
npm run build

# 4. Deploy (usando script)
chmod +x DEPLOY_FINAL_VPS.sh
./DEPLOY_FINAL_VPS.sh
```

## Deploy Manual (se o script não funcionar):

```bash
# 1. IR PARA O DIRETÓRIO DO PROJETO
cd /root/primecamp-ofc

# 2. Atualizar código
git pull origin main

# 3. Build
npm run build

# 4. Definir diretório Nginx
NGINX_ROOT="/var/www/primecamp.cloud"

# 5. Deploy
rm -rf "$NGINX_ROOT"/* 2>/dev/null
cp -r dist/* "$NGINX_ROOT"/
chown -R www-data:www-data "$NGINX_ROOT"
chmod -R 755 "$NGINX_ROOT"

# 6. Limpar cache nginx
rm -rf /var/cache/nginx/* 2>/dev/null
systemctl reload nginx
```

## Se os comandos não funcionarem:

Tente com caminhos completos:

```bash
# 1. IR PARA O DIRETÓRIO DO PROJETO
cd /root/primecamp-ofc

# 2. Atualizar código
/usr/bin/git pull origin main

# 3. Build
/usr/bin/npm run build

# 4. Deploy
NGINX_ROOT="/var/www/primecamp.cloud"
rm -rf "$NGINX_ROOT"/* 2>/dev/null
cp -r dist/* "$NGINX_ROOT"/
/usr/bin/chown -R www-data:www-data "$NGINX_ROOT"
/usr/bin/chmod -R 755 "$NGINX_ROOT"

# 5. Recarregar nginx
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
