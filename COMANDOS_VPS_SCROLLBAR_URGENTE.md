# 🚨 COMANDOS VPS - Fix Scrollbar URGENTE

## ⚠️ PROBLEMA:
Scrollbar não aparece mesmo depois de limpar cache

## ✅ SOLUÇÃO APLICADA:
1. Adicionado `!important` nas regras CSS do scrollbar
2. Adicionado regras globais `*` para garantir scrollbar em TODOS os elementos
3. Script de deploy urgente criado

## 🚀 DEPLOY RÁPIDO:

```bash
cd /root/primecamp-ofc
chmod +x DEPLOY_SCROLLBAR_URGENTE.sh
./DEPLOY_SCROLLBAR_URGENTE.sh
```

## 📋 DEPLOY MANUAL:

```bash
# 1. Atualizar código
cd /root/primecamp-ofc
git pull origin main

# 2. Build
npm run build

# 3. Deploy
NGINX_ROOT="/var/www/primecamp.cloud"  # ou "/var/www/html"
sudo rm -rf "$NGINX_ROOT"/*
sudo cp -r dist/* "$NGINX_ROOT"/
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"

# 4. Limpar cache e reiniciar nginx AGressivo
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl stop nginx
sleep 2
sudo systemctl start nginx
sudo systemctl reload nginx
```

## ⚠️ IMPORTANTE:

**Após o deploy, FAÇA:**
1. **Hard refresh no navegador:** `Ctrl+Shift+R` ou `Ctrl+F5`
2. **OU abra em aba anônima/privada** para testar sem cache
3. **Teste em:** https://primecamp.cloud/financeiro/transacoes

O scrollbar agora está aplicado **globalmente** em TODOS os elementos com overflow, então deve aparecer em todas as páginas!
