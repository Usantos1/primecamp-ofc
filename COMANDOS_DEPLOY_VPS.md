# Comandos para Deploy na VPS

## ⚡ Deploy Rápido (Uma Linha)

```bash
cd /root/primecamp-ofc && git pull origin main && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* && sudo systemctl reload nginx && echo "✅ Deploy concluído!"
```

## 📋 Alterações nesta versão:
- ✅ Removida foto de entrada da OS
- ✅ Checklist mostra apenas problemas encontrados (itens funcionais removidos)

## 📝 Deploy Manual (Passo a Passo)

```bash
# 1. Conectar na VPS
ssh usuario@seu-servidor

# 2. Navegar até o diretório do projeto
cd /root/primecamp-ofc

# 3. Buscar alterações
git fetch origin
git pull origin main

# 4. Instalar dependências (se necessário)
npm install

# 5. Limpar build anterior
rm -rf dist

# 6. Build do frontend
npm run build

# 7. Limpar diretório de deploy
sudo rm -rf /var/www/primecamp.cloud/*

# 8. Copiar arquivos buildados
sudo cp -r dist/* /var/www/primecamp.cloud/

# 9. Ajustar permissões
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud

# 10. Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*
sudo find /var/cache/nginx -type f -delete

# 11. Recarregar Nginx
sudo systemctl reload nginx

# 12. Verificar status
sudo systemctl status nginx
```
