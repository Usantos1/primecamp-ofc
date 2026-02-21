# Comandos para Deploy do Menu de Navegação Financeiro

Execute no servidor VPS:

```bash
cd /root/primecamp-ofc

# 1. Atualizar código do repositório
git pull origin main

# 2. Instalar dependências (se necessário)
npm install

# 3. Fazer build do frontend
npm run build

# 4. Deploy para Nginx
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# 5. Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

echo "✅ Deploy concluído!"
```

## Script Rápido (Tudo em um)

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
npm run build && \
sudo rm -rf /var/www/html/* && \
sudo cp -r dist/* /var/www/html/ && \
sudo chown -R www-data:www-data /var/www/html && \
sudo chmod -R 755 /var/www/html && \
sudo rm -rf /var/cache/nginx/* && \
sudo rm -rf /var/lib/nginx/cache/* && \
sudo systemctl reload nginx && \
echo "✅ Deploy concluído!"
```
