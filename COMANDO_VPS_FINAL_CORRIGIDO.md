# ✅ COMANDO FINAL CORRIGIDO PARA VPS

**Problema corrigido:** Erro de sintaxe TypeScript no arquivo JavaScript

---

## ✅ COMANDO COMPLETO (copiar e colar)

```bash
cd /root/primecamp-ofc && \
git pull origin main && \
pm2 stop all && \
pm2 delete all && \
sleep 2 && \
lsof -i :3000 && kill -9 $(lsof -t -i:3000) || true && \
cd server && \
node test-connection.js && \
cd .. && \
pm2 start server/index.js --name primecamp-api && \
pm2 save && \
pm2 logs primecamp-api --lines 30
```

---

## 🔍 VERIFICAÇÃO PASSO A PASSO

### 1. Atualizar código:
```bash
cd /root/primecamp-ofc && git pull origin main
```

### 2. Parar processos antigos:
```bash
pm2 stop all && pm2 delete all
```

### 3. Liberar porta 3000:
```bash
lsof -i :3000 && kill -9 $(lsof -t -i:3000) || true
```

### 4. Testar conexão:
```bash
cd server && node test-connection.js
```

### 5. Iniciar servidor:
```bash
cd .. && pm2 start server/index.js --name primecamp-api && pm2 save
```

### 6. Ver logs:
```bash
pm2 logs primecamp-api --lines 30
```

---

## ✅ RESULTADO ESPERADO

**Deve mostrar:**
```
🚀 Servidor rodando em http://localhost:3000
📊 Conectado ao PostgreSQL: 72.62.106.76
💾 Database: banco_gestao
```

**Status PM2:**
```
status: online
```

---

**Status:** ✅ Erro de sintaxe corrigido no código. Execute o comando acima na VPS.

