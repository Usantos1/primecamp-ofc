# 🔧 Corrigir Erro EADDRINUSE - Porta 3000 em Uso

## ❌ PROBLEMA:
A API não consegue iniciar porque a porta 3000 já está em uso por outro processo.

## ✅ SOLUÇÃO:

### 1. Parar TODOS os processos PM2 relacionados

```bash
pm2 stop all
pm2 delete all
```

### 2. Verificar e matar processos usando a porta 3000

```bash
# Ver qual processo está usando a porta 3000
lsof -i :3000
# ou
netstat -tulpn | grep :3000

# Matar o processo (substitua PID pelo número do processo)
kill -9 PID

# Ou matar todos os processos Node.js na porta 3000
fuser -k 3000/tcp
```

### 3. Limpar processos Node.js órfãos

```bash
# Matar todos os processos node
pkill -9 node

# Verificar se ainda há processos
ps aux | grep node
```

### 4. Reiniciar a API corretamente

```bash
cd /root/primecamp-ofc/server

# Verificar se o código está atualizado
git pull origin main

# Instalar dependências se necessário
npm install

# Iniciar com PM2
pm2 start index.js --name primecamp-api

# Ver logs
pm2 logs primecamp-api --lines 50
```

### 5. Se ainda der erro, verificar se há outro serviço na porta 3000

```bash
# Ver todos os processos na porta 3000
ss -tulpn | grep :3000

# Ver processos PM2
pm2 list

# Ver status detalhado
pm2 status
```

## 🔍 Verificar se funcionou:

```bash
# Ver logs da API
pm2 logs primecamp-api --lines 20

# Ver status
pm2 status

# Testar se a API está respondendo
curl http://localhost:3000/api/health
```

## ⚠️ Se ainda não funcionar:

Pode ser que o Nginx esteja redirecionando para a porta 3000. Verifique:

```bash
# Ver configuração do Nginx
cat /etc/nginx/sites-available/default | grep 3000

# Ver se Nginx está rodando
systemctl status nginx
```
