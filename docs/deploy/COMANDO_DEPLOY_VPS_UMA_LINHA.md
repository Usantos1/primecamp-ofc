# Deploy VPS – Comando em uma linha (sempre com cd)

**Use estes comandos na VPS** (SSH no servidor). O `cd` no início é obrigatório para funcionar de qualquer diretório.

## Uma linha (copiar inteiro, incluindo a aspas final do echo)

```bash
cd /root/primecamp-ofc && git pull origin main && npm install && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* 2>/dev/null; sudo systemctl reload nginx && cd server && npm install --production && pm2 restart primecamp-api && cd .. && echo "Deploy concluido!"
```

**Atenção:** use o comando inteiro; não corte no meio. A parte do Nginx usa `;` de propósito (reload roda mesmo se o cache não existir).

## Em vários passos (se a uma linha falhar ou para ver em qual passo deu erro)

```bash
cd /root/primecamp-ofc
git pull origin main
npm install
npm run build
sudo rm -rf /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo rm -rf /var/cache/nginx/* 2>/dev/null
sudo systemctl reload nginx
cd server
npm install --production
pm2 restart primecamp-api
cd ..
echo "Deploy concluido!"
```

Se a pasta do projeto for outra (ex.: `/root/primecamp`), troque o primeiro `cd` para o caminho correto. Se o nome do app no PM2 for outro, use `pm2 list` para ver o nome e troque `primecamp-api` no `pm2 restart`.

## Ordem dos passos

1. `cd /root/primecamp-ofc` – entra na pasta do projeto  
2. `git pull origin main` – atualiza o código  
3. `npm install` – dependências do frontend (raiz)  
4. `npm run build` – build do frontend  
5. Limpa e copia `dist/*` para `/var/www/primecamp.cloud/`  
6. Ajusta dono e permissões  
7. Limpa cache do Nginx e recarrega  
8. `cd server` → `npm install --production` → `pm2 restart primecamp-api` → `cd ..`

## Requisito: Node 18+ na API

A API usa o **fetch nativo** do Node (sem `node-fetch` nem `form-data`). É necessário **Node 18 ou superior** no ambiente onde a API roda. Para conferir: `node -v`. Se for menor que 18, atualize: `nvm install 20 && nvm use 20` (ou use o método do seu provedor).

## Se aparecer "Cannot find package 'form-data'" (Telegram)

O `form-data` está no `package.json` do server para dependências transitivas. Na VPS, atualize o código, **reinstale** as dependências do server e reinicie a API:

```bash
cd /root/primecamp-ofc && git fetch origin && git reset --hard origin/main && cd server && rm -rf node_modules && npm install --production && pm2 restart primecamp-api && echo "OK"
```

Assim o pacote `form-data` é instalado e o erro some.
