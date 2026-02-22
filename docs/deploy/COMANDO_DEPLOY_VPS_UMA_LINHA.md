# Deploy VPS – Comando em uma linha (sempre com cd)

**Use este comando na VPS.** O `cd /root/primecamp-ofc &&` no início é obrigatório para funcionar de qualquer diretório.

```bash
cd /root/primecamp-ofc && git pull origin main && npm install && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* && sudo systemctl reload nginx && cd server && npm install --production && pm2 restart primecamp-api && cd .. && echo "✅ Deploy concluído!"
```

## Ordem dos passos

1. `cd /root/primecamp-ofc` – entra na pasta do projeto  
2. `git pull origin main` – atualiza o código  
3. `npm install` – dependências do frontend (raiz)  
4. `npm run build` – build do frontend  
5. Limpa e copia `dist/*` para `/var/www/primecamp.cloud/`  
6. Ajusta dono e permissões  
7. Limpa cache do Nginx e recarrega  
8. `cd server` → `npm install --production` → `pm2 restart primecamp-api` → `cd ..`
