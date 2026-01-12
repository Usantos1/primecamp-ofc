# 🎯 Deploy do Scrollbar Melhorado

Execute no servidor:

```bash
cd /root/primecamp-ofc
git pull origin main
chmod +x DEPLOY_SCROLLBAR.sh
./DEPLOY_SCROLLBAR.sh
```

Ou manualmente:

```bash
cd /root/primecamp-ofc
git pull origin main
npm run build
NGINX_ROOT="/var/www/primecamp.cloud"
sudo rm -rf "$NGINX_ROOT"/*
sudo cp -r dist/* "$NGINX_ROOT/"
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx
```

Depois: Ctrl+Shift+R no navegador!

## O que foi melhorado:

✅ Scrollbar agora tem 10px (mais visível)
✅ Cores mais escuras (mais fácil de ver)
✅ Borda sutil no thumb
✅ Hover e active states
