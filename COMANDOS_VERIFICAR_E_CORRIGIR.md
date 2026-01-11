# 🔧 Comandos para Verificar e Corrigir Menu e Scrollbar

## 1. Verificar se está no build

```bash
cd /root/primecamp-ofc
chmod +x VERIFICAR_MENU_BUILD.sh
./VERIFICAR_MENU_BUILD.sh
```

## 2. Se não estiver no bundle, fazer rebuild completo

```bash
cd /root/primecamp-ofc
git pull origin main
rm -rf dist node_modules/.vite
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx
echo "✅ Rebuild completo concluído!"
```

## 3. No navegador

1. Abrir DevTools (F12)
2. Ir na aba "Network"
3. Marcar "Disable cache"
4. Fazer hard refresh: Ctrl+Shift+R ou Ctrl+F5

## 4. Se ainda não aparecer

Verificar se há erros no console (F12 > Console) e me enviar os erros.
