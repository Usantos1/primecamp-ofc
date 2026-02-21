# Deploy na VPS – Comandos completos

Código já foi enviado para o Git (`git push origin main`). Use os comandos abaixo **na VPS** para atualizar frontend e, se precisar, o backend.

---

## 1) Conectar na VPS

```bash
ssh root@SEU_IP_DA_VPS
```

*(Substitua `SEU_IP_DA_VPS` pelo IP ou host da sua VPS. Se usar usuário diferente de `root`, use `ssh usuario@SEU_IP_DA_VPS`.)*

---

## 2) Deploy completo (uma linha) – frontend + backend

Recomendado: atualiza código, faz build do frontend, publica no Nginx e reinicia a API.

```bash
cd /root/primecamp-ofc && git pull origin main && npm install && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* && sudo systemctl reload nginx && cd server && npm install --production && pm2 restart primecamp-api && cd .. && echo "✅ Deploy concluído!"
```

---

## 3) Deploy passo a passo (se preferir executar um por um)

```bash
# 1. Ir para o projeto
cd /root/primecamp-ofc

# 2. Atualizar código do repositório
git pull origin main

# 3. Dependências do frontend (raiz do projeto)
npm install

# 4. Build do frontend (Vite)
npm run build

# 5. Conferir se a pasta dist foi gerada
ls -la dist/

# 6. Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*

# 7. Limpar diretório de deploy do site
sudo rm -rf /var/www/primecamp.cloud/*

# 8. Copiar build para o diretório do Nginx
sudo cp -r dist/* /var/www/primecamp.cloud/

# 9. Ajustar dono e permissões
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud

# 10. Testar configuração do Nginx
sudo nginx -t

# 11. Recarregar Nginx
sudo systemctl reload nginx

# 12. Atualizar e reiniciar a API (backend)
cd server
npm install --production
pm2 restart primecamp-api
cd ..

# 13. Verificar status
pm2 status
sudo systemctl status nginx --no-pager
echo "✅ Deploy concluído!"
```

---

## 4) Só frontend (sem mexer na API)

Se só alterou o frontend e não quer reiniciar o backend:

```bash
cd /root/primecamp-ofc && git pull origin main && npm install && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* && sudo systemctl reload nginx && echo "✅ Frontend atualizado!"
```

---

## 5) Só backend (reiniciar API)

Se só alterou algo no `server/` ou quer só reiniciar a API:

```bash
cd /root/primecamp-ofc && git pull origin main && cd server && npm install --production && pm2 restart primecamp-api && pm2 save && cd .. && echo "✅ Backend atualizado!"
```

---

## 6) Verificar depois do deploy

```bash
# Status da API
pm2 status

# Últimas linhas do log da API
pm2 logs primecamp-api --lines 30 --nostream

# Nginx respondendo
sudo systemctl status nginx --no-pager

# Teste rápido do site (troque pelo seu domínio)
curl -I https://primecamp.cloud
```

---

## 7) Se o Nginx usar outro diretório

Se o site não estiver em `/var/www/primecamp.cloud`, descubra o `root`:

```bash
sudo grep -A 10 "server_name primecamp.cloud" /etc/nginx/sites-available/primecamp.cloud | grep root
# ou
sudo grep -A 10 "server_name primecamp.cloud" /etc/nginx/sites-enabled/* | grep root
```

Use o caminho que aparecer em `root` no lugar de `/var/www/primecamp.cloud` nos comandos acima.

---

## Resumo rápido

| O que fazer | Comando |
|------------|--------|
| **Deploy completo (front + back)** | Comando da seção **2** |
| **Só frontend** | Comando da seção **4** |
| **Só backend** | Comando da seção **5** |
| **Passo a passo** | Comandos da seção **3** |

Depois do deploy, faça um hard refresh no navegador (Ctrl+Shift+R) ou limpe o cache para ver a nova versão.
