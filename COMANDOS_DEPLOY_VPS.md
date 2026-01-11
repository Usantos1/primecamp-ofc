# 🚀 Comandos para Deploy no VPS

## Deploy Rápido (Recomendado)

```bash
cd /root/primecamp-ofc
git pull origin main
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx
echo "✅ Deploy concluído!"
```

## Script Automatizado

```bash
cd /root/primecamp-ofc
git pull origin main
chmod +x DEPLOY_MENU_FINANCEIRO.sh
./DEPLOY_MENU_FINANCEIRO.sh
```

## Uma Linha (Copy & Paste)

```bash
cd /root/primecamp-ofc && git pull origin main && npm run build && sudo rm -rf /var/www/html/* && sudo cp -r dist/* /var/www/html/ && sudo chown -R www-data:www-data /var/www/html && sudo chmod -R 755 /var/www/html && sudo rm -rf /var/cache/nginx/* && sudo rm -rf /var/lib/nginx/cache/* && sudo systemctl reload nginx && echo "✅ Deploy concluído!"
```

## O que será deployado:

✅ Menu de navegação no topo das páginas do financeiro
✅ Scrollbar mais visível e discreto
✅ Componente FinanceiroNavMenu compartilhado
✅ Ajustes no CSS do scrollbar
