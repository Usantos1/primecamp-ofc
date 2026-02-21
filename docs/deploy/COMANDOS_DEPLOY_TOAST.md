# 🚀 Comandos de Deploy - Correção do Toast

## ✅ Alteração Commitada

`fix: remover setIsLoading(false) desnecessário na validação de campos obrigatórios`

## 📋 Comandos para Deploy na VPS

```bash
cd /root/primecamp-ofc
git pull origin main
npm install
npm run build
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/* /var/www/primecamp.cloud/.*
sleep 1
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo nginx -t
sudo systemctl reload nginx
```

## 🧪 Como Testar

1. Limpe o cache do navegador (`Ctrl + Shift + R`)
2. Tente salvar uma OS sem preencher campos obrigatórios
3. Deve aparecer um toast/notificação vermelho no canto da tela listando todos os campos faltando
4. O toast deve fechar automaticamente após alguns segundos
