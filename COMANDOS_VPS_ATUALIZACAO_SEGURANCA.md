# 🚀 COMANDOS COMPLETOS PARA ATUALIZAR NA VPS

**Data:** $(date)
**Objetivo:** Atualizar código e corrigir variáveis de ambiente após correções de segurança

---

## 📋 PASSO A PASSO COMPLETO

### 1. Conectar na VPS
```bash
ssh root@72.62.106.76
```

### 2. Navegar para o diretório do projeto
```bash
cd /root/primecamp-ofc
```

### 3. Atualizar código do Git
```bash
git pull origin main
```

### 4. Atualizar arquivo .env

**⚠️ IMPORTANTE:** Antes de continuar, faça backup do .env atual:
```bash
cp .env .env.backup
```

**Editar o arquivo .env:**
```bash
nano .env
```

**Remover as variáveis antigas `VITE_DB_*` e adicionar as novas `DB_*`:**

```env
# ============================================
# BACKEND - PostgreSQL (OBRIGATÓRIO)
# ============================================
DB_HOST=72.62.106.76
DB_NAME=banco_gestao
DB_USER=postgres
DB_PASSWORD=AndinhoSurf2015@
DB_PORT=5432
DB_SSL=false

# ============================================
# BACKEND - JWT (OBRIGATÓRIO)
# ============================================
JWT_SECRET=seu_jwt_secret_aqui

# ============================================
# BACKEND - Server
# ============================================
PORT=3000
VITE_API_ORIGIN=http://localhost:5173,http://localhost:8080,https://primecamp.cloud
STORAGE_BASE_URL=https://api.primecamp.cloud/uploads
FRONTEND_URL=https://primecamp.cloud

# ============================================
# FRONTEND - API URL (exposta ao frontend)
# ============================================
VITE_API_URL=https://api.primecamp.cloud/api
VITE_STORAGE_BASE_URL=https://api.primecamp.cloud/uploads
```

**Salvar:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 5. Verificar se as variáveis estão corretas
```bash
cat .env | grep -E "^DB_|^JWT_SECRET"
```

**Deve mostrar:**
```
DB_HOST=72.62.106.76
DB_NAME=banco_gestao
DB_USER=postgres
DB_PASSWORD=AndinhoSurf2015@
DB_PORT=5432
DB_SSL=false
JWT_SECRET=seu_jwt_secret_aqui
```

### 6. Instalar dependências do backend (se necessário)
```bash
cd server
npm install
cd ..
```

### 7. Testar conexão com PostgreSQL
```bash
cd server
node test-connection.js
cd ..
```

**Se der erro:** Verifique se as variáveis `DB_*` estão corretas no `.env`

### 8. Reiniciar o servidor backend (PM2)
```bash
pm2 restart primecamp-api
```

### 9. Verificar logs do servidor
```bash
pm2 logs primecamp-api --lines 50
```

**Deve mostrar:**
```
🚀 Servidor rodando em http://localhost:3000
📊 Conectado ao PostgreSQL: 72.62.106.76
💾 Database: banco_gestao
```

### 10. Testar health check
```bash
curl http://localhost:3000/api/health
```

**Deve retornar:**
```json
{"status":"ok","timestamp":"..."}
```

### 11. Verificar status do PM2
```bash
pm2 status
```

**Deve mostrar `primecamp-api` como `online`**

---

## 🔍 VERIFICAÇÕES FINAIS

### Verificar se não há mais variáveis VITE_DB_* no código
```bash
cd /root/primecamp-ofc
grep -r "VITE_DB_" server/ || echo "✅ Nenhuma variável VITE_DB_ encontrada no backend"
```

### Verificar se o servidor está usando DB_*
```bash
pm2 logs primecamp-api --lines 20 | grep -E "DB_|PostgreSQL"
```

---

## ⚠️ TROUBLESHOOTING

### Erro: "Variáveis de ambiente obrigatórias não encontradas"
**Solução:** Verifique se o arquivo `.env` tem todas as variáveis `DB_*` e `JWT_SECRET`

### Erro: "Connection refused" ao testar conexão
**Solução:** 
1. Verifique se PostgreSQL está rodando: `systemctl status postgresql`
2. Verifique se as credenciais estão corretas no `.env`
3. Verifique firewall: `ufw status`

### Erro: "JWT_SECRET não encontrado"
**Solução:** Adicione `JWT_SECRET=seu_secret_aqui` no `.env`

---

## ✅ CHECKLIST FINAL

- [ ] Código atualizado (`git pull`)
- [ ] Arquivo `.env` atualizado com variáveis `DB_*`
- [ ] Variáveis `VITE_DB_*` removidas do `.env`
- [ ] Teste de conexão passou (`node test-connection.js`)
- [ ] Servidor reiniciado (`pm2 restart primecamp-api`)
- [ ] Health check funcionando (`curl http://localhost:3000/api/health`)
- [ ] Logs sem erros (`pm2 logs primecamp-api`)

---

## 📝 COMANDO ÚNICO (copiar e colar)

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
cp .env .env.backup && \
echo "⚠️  ATENÇÃO: Edite o arquivo .env manualmente para adicionar variáveis DB_*" && \
echo "   Remova VITE_DB_* e adicione:" && \
echo "   DB_HOST=72.62.106.76" && \
echo "   DB_NAME=banco_gestao" && \
echo "   DB_USER=postgres" && \
echo "   DB_PASSWORD=AndinhoSurf2015@" && \
echo "   DB_PORT=5432" && \
echo "   DB_SSL=false" && \
echo "   JWT_SECRET=seu_jwt_secret_aqui" && \
echo "" && \
echo "Depois execute:" && \
echo "cd server && npm install && node test-connection.js && cd .. && pm2 restart primecamp-api"
```

---

**Status:** ✅ Comandos prontos para execução

