# 🔧 Corrigir Erro: Porta 3000 já em uso

## ❌ PROBLEMA:

```
Error: listen EADDRINUSE: address already in use :::3000
```

A porta 3000 já está sendo usada por outro processo.

## ✅ SOLUÇÃO:

### 1. Parar TODAS as instâncias da API

```bash
pm2 stop primecamp-api
pm2 delete primecamp-api
```

### 2. Verificar se há processos usando a porta 3000

```bash
# Ver processos na porta 3000
lsof -i :3000
# ou
netstat -tulpn | grep :3000
```

### 3. Matar processos que estão usando a porta (se necessário)

```bash
# Se encontrar processos, matar:
kill -9 <PID>
# ou matar todos os processos Node na porta 3000:
fuser -k 3000/tcp
```

### 4. Verificar se PM2 não tem processos órfãos

```bash
pm2 kill
pm2 list
```

### 5. Reiniciar API corretamente

```bash
cd /root/primecamp-ofc/server

# Verificar se dependências estão instaladas
npm list jsonwebtoken bcrypt

# Se não estiverem, instalar:
npm install

# Iniciar API novamente
pm2 start index.js --name primecamp-api
pm2 save
```

### 6. Verificar se está funcionando

```bash
pm2 logs primecamp-api --lines 20
curl http://localhost:3000/health
```

Deve retornar: `{"status":"ok","database":"connected"}`

## 📋 DEPOIS QUE A API ESTIVER FUNCIONANDO:

### Continuar com o rebuild do frontend:

```bash
cd /root/primecamp-ofc
git pull origin main
rm -rf dist
npm run build
sudo cp -r dist/* /var/www/html/
```

## ✅ CHECKLIST:

- [ ] PM2 parou todas as instâncias
- [ ] Porta 3000 está livre
- [ ] Dependências instaladas (`npm install` no servidor)
- [ ] API iniciada e funcionando (`/health` retorna OK)
- [ ] Frontend rebuildado
- [ ] Arquivos copiados para `/var/www/html/`

