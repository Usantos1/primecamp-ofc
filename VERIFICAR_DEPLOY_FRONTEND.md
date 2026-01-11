# 🔍 Verificação do Deploy Frontend

Execute estes comandos para verificar se tudo está correto:

```bash
# 1. Verificar se as rotas financeiro estão no bundle deployado
echo "🔍 Verificando rotas no bundle:"
grep -r "DashboardExecutivo\|path=\"/financeiro" /var/www/html/assets/*.js | head -5

# 2. Verificar tamanho do bundle (deve ser ~6.5MB)
ls -lh /var/www/html/assets/index-*.js

# 3. Verificar se os arquivos foram copiados corretamente
ls -la /var/www/html/ | head -10

# 4. Verificar permissões
ls -la /var/www/html/assets/ | head -5

# 5. Verificar conteúdo do index.html
head -20 /var/www/html/index.html

# 6. Testar se o Nginx está servindo os arquivos
curl -I http://localhost/financeiro

# 7. Limpar cache do Nginx novamente (super agressivo)
sudo systemctl stop nginx
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo find /var/cache -type f -name "*nginx*" -delete 2>/dev/null || true
sudo systemctl start nginx
sudo systemctl status nginx
```

## ✅ Se as rotas NÃO estiverem no bundle:

O build pode não ter incluído as rotas. Execute:

```bash
cd /root/primecamp-ofc
rm -rf dist node_modules/.vite
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo systemctl reload nginx
```

## ✅ Se as rotas ESTIVEREM no bundle mas ainda não funcionar:

1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Teste em modo anônimo/privado
3. Verifique os logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
