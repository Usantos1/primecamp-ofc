# COMANDOS COMPLETOS PARA DEPLOY NA VPS

## 🔧 Preparação (Local)

### 1. Commit e Push (se ainda não fez)
```bash
git add .
git commit -m "feat: correções e melhorias"
git push origin main
```

---

## 🚀 DEPLOY NA VPS

### 1. Conectar na VPS
```bash
ssh root@seu-servidor-vps
# ou
ssh usuario@seu-servidor-vps
```

### 2. Ir para o diretório do projeto
```bash
cd /root/primecamp-ofc
# ou
cd ~/primecamp-ofc
```

### 3. Atualizar código (pull do GitHub)
```bash
git pull origin main
```

### 4. Atualizar dependências (se necessário)
```bash
# Backend
cd server
npm install
cd ..

# Frontend (se houver mudanças no package.json)
cd src  # ou onde estiver o frontend
npm install
cd ..
```

### 5. Build do Frontend
```bash
# Ir para o diretório do frontend
cd /root/primecamp-ofc

# Build (ajuste o comando conforme seu projeto)
npm run build
# ou
npm run build:prod
```

### 6. Copiar arquivos buildados para Nginx
```bash
# Copiar arquivos do build para o diretório do Nginx
cp -r dist/* /var/www/primecamp.cloud/
# ou
cp -r build/* /var/www/primecamp.cloud/
# ou
rsync -av --delete dist/ /var/www/primecamp.cloud/

# Ajustar permissões
chown -R www-data:www-data /var/www/primecamp.cloud/
chmod -R 755 /var/www/primecamp.cloud/
```

### 7. Reiniciar Backend (PM2)
```bash
# Verificar status
pm2 list

# Reiniciar todas as aplicações
pm2 restart all

# Ou reiniciar específica
pm2 restart primecamp-api
# ou
pm2 restart server/index.js

# Ver logs
pm2 logs primecamp-api --lines 50
```

### 8. Reiniciar Backend (Systemd - alternativa)
```bash
# Se usar systemd ao invés de PM2
systemctl restart primecamp-api
# ou
systemctl restart node-api

# Ver status
systemctl status primecamp-api

# Ver logs
journalctl -u primecamp-api -n 50 -f
```

### 9. Reiniciar Nginx (se necessário)
```bash
# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
# ou
service nginx restart

# Recarregar configuração (sem downtime)
systemctl reload nginx
```

### 10. Limpar Cache do Nginx
```bash
# Limpar cache do Nginx
rm -rf /var/cache/nginx/*
systemctl reload nginx

# Ou limpar cache do navegador (instruir usuário)
# Ctrl + Shift + R (hard refresh)
```

---

## 📋 COMANDO ÚNICO (Script Completo)

Crie um script `deploy.sh` no servidor:

```bash
#!/bin/bash

echo "🚀 Iniciando deploy..."

# 1. Ir para o diretório
cd /root/primecamp-ofc || exit

# 2. Pull do código
echo "📥 Atualizando código..."
git pull origin main

# 3. Build do frontend
echo "🔨 Buildando frontend..."
npm run build

# 4. Copiar para Nginx
echo "📦 Copiando arquivos..."
cp -r dist/* /var/www/primecamp.cloud/
chown -R www-data:www-data /var/www/primecamp.cloud/
chmod -R 755 /var/www/primecamp.cloud/

# 5. Reiniciar backend (PM2)
echo "🔄 Reiniciando backend..."
pm2 restart all

# 6. Limpar cache Nginx
echo "🧹 Limpando cache..."
rm -rf /var/cache/nginx/*
systemctl reload nginx

echo "✅ Deploy concluído!"
echo "📊 Verificando status..."
pm2 list
```

**Tornar executável:**
```bash
chmod +x deploy.sh
```

**Executar:**
```bash
./deploy.sh
```

---

## 🔍 VERIFICAÇÃO PÓS-DEPLOY

### 1. Verificar Backend
```bash
# Ver status PM2
pm2 list

# Ver logs em tempo real
pm2 logs primecamp-api --lines 100

# Testar endpoint
curl http://localhost:3000/api/health
# ou
curl https://api.primecamp.cloud/api/health
```

### 2. Verificar Frontend
```bash
# Verificar se arquivos estão no lugar
ls -la /var/www/primecamp.cloud/

# Testar acesso
curl -I https://primecamp.cloud
```

### 3. Verificar Nginx
```bash
# Ver logs de erro
tail -f /var/log/nginx/error.log

# Ver logs de acesso
tail -f /var/log/nginx/access.log
```

---

## 🐛 TROUBLESHOOTING

### Se o backend não iniciar:
```bash
# Ver logs detalhados
pm2 logs primecamp-api --err --lines 200

# Verificar se porta está em uso
netstat -tulpn | grep :3000
# ou
lsof -i :3000

# Reiniciar do zero
pm2 delete primecamp-api
pm2 start server/index.js --name primecamp-api
pm2 save
```

### Se o frontend não carregar:
```bash
# Verificar permissões
ls -la /var/www/primecamp.cloud/

# Verificar logs do Nginx
tail -50 /var/log/nginx/error.log

# Verificar configuração do Nginx
nginx -t
cat /etc/nginx/sites-available/primecamp.cloud
```

### Se houver erros de dependências:
```bash
# Reinstalar dependências
cd /root/primecamp-ofc/server
rm -rf node_modules package-lock.json
npm install

cd /root/primecamp-ofc
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 NOTAS IMPORTANTES

1. **Backup antes do deploy:**
   ```bash
   # Backup do banco (recomendado antes de mudanças grandes)
   pg_dump banco_gestao > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Variáveis de ambiente:**
   - Verificar se `.env` está configurado corretamente
   - Se usar PM2, variáveis podem estar no `ecosystem.config.js`

3. **Build do frontend:**
   - Verificar se o build está gerando os arquivos corretos
   - Verificar se o caminho de output está correto

4. **Cache do navegador:**
   - Usuários podem precisar fazer hard refresh (Ctrl+Shift+R)
   - Ou limpar cache do navegador

---

## ✅ CHECKLIST DE DEPLOY

- [ ] Código commitado e pushado
- [ ] Conectado na VPS
- [ ] Git pull executado
- [ ] Dependências atualizadas (se necessário)
- [ ] Build do frontend executado
- [ ] Arquivos copiados para Nginx
- [ ] Permissões ajustadas
- [ ] Backend reiniciado
- [ ] Nginx reiniciado/recarregado
- [ ] Cache limpo
- [ ] Testado acesso ao site
- [ ] Verificado logs de erro

---

**Última atualização:** 2025-01-13
