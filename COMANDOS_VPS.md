# 🚀 COMANDOS PARA VPS - DEPLOY DOS ENDPOINTS

**Data:** $(date)
**Objetivo:** Atualizar VPS com os novos endpoints implementados

---

## 📋 PRÉ-REQUISITOS

- ✅ Acesso SSH à VPS
- ✅ Node.js instalado
- ✅ PM2 ou similar para gerenciar processos
- ✅ Git configurado na VPS

---

## 🔄 PASSO 1: ATUALIZAR CÓDIGO

```bash
# Conectar na VPS
ssh usuario@seu-servidor.com

# Ir para o diretório do projeto
cd /root/primecamp-ofc

# Fazer pull das alterações
git pull origin main

# Verificar se há alterações
git log --oneline -3
```

---

## 📦 PASSO 2: INSTALAR DEPENDÊNCIAS DO BACKEND

```bash
# Ir para o diretório do servidor
cd server

# Instalar nova dependência (multer)
npm install

# Verificar se multer foi instalado
npm list multer
```

---

## 🔧 PASSO 3: VERIFICAR VARIÁVEIS DE AMBIENTE

```bash
# Verificar se .env existe e tem as variáveis necessárias
cat ../.env | grep -E "STORAGE_BASE_URL|VITE_DB_|PORT|JWT_SECRET"

# Se STORAGE_BASE_URL não existir, adicionar (opcional)
# echo "STORAGE_BASE_URL=https://api.primecamp.cloud/uploads" >> ../.env
```

**Variáveis necessárias:**
```env
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false
PORT=3000
JWT_SECRET=your_jwt_secret_here_change_in_production
STORAGE_BASE_URL=https://api.primecamp.cloud/uploads  # Opcional
```

---

## 📁 PASSO 4: CRIAR DIRETÓRIO DE UPLOADS

```bash
# Criar diretório para uploads (se não existir)
mkdir -p /root/primecamp-ofc/server/uploads

# Dar permissões adequadas
chmod 755 server/uploads

# Verificar se foi criado
ls -la /root/primecamp-ofc/server/uploads
```

---

## 🔄 PASSO 5: REINICIAR SERVIDOR BACKEND

### Opção A: Se usar PM2

```bash
# Parar o processo atual
pm2 stop primecamp-api
# ou
pm2 stop all

# Reiniciar com as novas alterações
pm2 restart primecamp-api
# ou
pm2 restart all

# Verificar status
pm2 status

# Ver logs em tempo real
pm2 logs primecamp-api --lines 50
```

### Opção B: Se usar systemd

```bash
# Reiniciar serviço
sudo systemctl restart primecamp-api

# Verificar status
sudo systemctl status primecamp-api

# Ver logs
sudo journalctl -u primecamp-api -f --lines 50
```

### Opção C: Se rodar manualmente

```bash
# Parar processo atual (Ctrl+C ou kill)
# Ir para diretório do servidor
cd server

# Rodar servidor
npm start
# ou em desenvolvimento
npm run dev
```

---

## ✅ PASSO 6: VERIFICAR SE ESTÁ FUNCIONANDO

```bash
# Testar health check
curl http://localhost:3000/api/health

# Testar se endpoints estão acessíveis (deve retornar 401 sem token)
curl -X POST http://localhost:3000/api/functions/admin-get-user \
  -H "Content-Type: application/json" \
  -d '{"userId":"test"}'

# Verificar se diretório uploads existe e está acessível
ls -la server/uploads
```

---

## 🔍 PASSO 7: VERIFICAR LOGS

```bash
# Se usar PM2
pm2 logs primecamp-api --lines 100

# Se usar systemd
sudo journalctl -u primecamp-api -n 100

# Se rodar manualmente, os logs aparecem no terminal
```

**Logs esperados ao iniciar:**
```
🚀 Servidor rodando em http://localhost:3000
📊 Conectado ao PostgreSQL: 72.62.106.76
💾 Database: banco_gestao
```

---

## 🧪 PASSO 8: TESTAR ENDPOINTS (OPCIONAL)

```bash
# 1. Obter token de autenticação primeiro (fazer login)
TOKEN="seu_token_aqui"

# 2. Testar admin-get-user (precisa ser admin)
curl -X POST http://localhost:3000/api/functions/admin-get-user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid-do-usuario"}'

# 3. Testar disc-session-status
curl -X POST http://localhost:3000/api/functions/disc-session-status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"uuid-da-sessao"}'
```

---

## 🔒 PASSO 9: CONFIGURAR NGINX (SE NECESSÁRIO)

Se você usa Nginx como proxy reverso, verificar se está configurado:

```bash
# Verificar configuração do Nginx
sudo nano /etc/nginx/sites-available/primecamp

# Verificar se há rota para /uploads
# Deve ter algo como:
# location /uploads {
#   alias /caminho/para/primecamp/server/uploads;
#   expires 30d;
# }

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 📊 RESUMO DOS COMANDOS (TUDO EM UM)

```bash
# 1. Atualizar código
cd /root/primecamp-ofc
git pull origin main

# 2. Instalar dependências
cd server
npm install

# 3. Criar diretório uploads
mkdir -p uploads
chmod 755 uploads

# 4. Reiniciar servidor (PM2)
pm2 restart primecamp-api

# 5. Verificar logs
pm2 logs primecamp-api --lines 50

# 6. Testar health check
curl http://localhost:3000/api/health
```

---

## ⚠️ TROUBLESHOOTING

### Erro: "Cannot find module 'multer'"
```bash
cd server
npm install multer
```

### Erro: "EACCES: permission denied" ao criar uploads
```bash
mkdir -p server/uploads
chmod 755 server/uploads
```

### Erro: "Port 3000 already in use"
```bash
# Encontrar processo usando a porta
lsof -i :3000
# ou
netstat -tulpn | grep 3000

# Matar processo
kill -9 PID_DO_PROCESSO
```

### Erro: "Database connection failed"
```bash
# Verificar variáveis de ambiente
cat ../.env | grep VITE_DB_

# Testar conexão manual
psql -h 72.62.106.76 -U postgres -d banco_gestao
```

### Servidor não inicia
```bash
# Verificar logs detalhados
cd server
npm start

# Verificar se porta está livre
netstat -tulpn | grep 3000

# Verificar se Node.js está instalado
node --version
npm --version
```

---

## 🔄 ROLLBACK (SE NECESSÁRIO)

```bash
# Voltar para commit anterior
cd /root/primecamp-ofc
git log --oneline -5
git reset --hard COMMIT_ANTERIOR

# Reiniciar servidor
pm2 restart primecamp-api
```

---

## ✅ CHECKLIST FINAL

- [ ] Código atualizado (`git pull`)
- [ ] Dependências instaladas (`npm install`)
- [ ] Diretório `uploads` criado
- [ ] Variáveis de ambiente configuradas
- [ ] Servidor reiniciado
- [ ] Health check funcionando
- [ ] Logs sem erros
- [ ] Endpoints acessíveis

---

## 📝 NOTAS IMPORTANTES

1. **STORAGE_BASE_URL:** Se não configurado, usa `http://localhost:3000/uploads` automaticamente
2. **Permissões:** Garantir que o diretório `uploads` tenha permissões de escrita
3. **Nginx:** Se usar Nginx, configurar rota para `/uploads` servir arquivos estáticos
4. **Backup:** Fazer backup do banco antes de atualizar (se necessário)

---

**Status:** ✅ **PRONTO PARA EXECUTAR NA VPS**

