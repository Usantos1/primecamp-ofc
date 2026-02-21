# 🎯 Deploy do Menu em Todas as Páginas

O menu de navegação agora está em TODAS as 9 páginas do financeiro!

## Páginas com menu:

✅ Dashboard Executivo
✅ Recomendações  
✅ Estoque Inteligente
✅ Análise Vendedores
✅ Análise Produtos
✅ Previsões
✅ DRE
✅ Planejamento Anual
✅ Precificação

## Deploy:

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
