# 🚀 COMANDOS CORRETOS PARA VPS

**Caminho correto:** `/root/primecamp-ofc`

---

## 📋 COMANDOS RÁPIDOS

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

## 🔄 OU EXECUTAR SCRIPT AUTOMÁTICO

```bash
cd /root/primecamp-ofc
bash DEPLOY_VPS.sh
```

---

## ✅ VERIFICAÇÕES

```bash
# Verificar se está rodando
pm2 status

# Ver logs
pm2 logs primecamp-api --lines 100

# Testar endpoint (deve retornar 401 sem token)
curl -X POST http://localhost:3000/api/functions/admin-get-user \
  -H "Content-Type: application/json" \
  -d '{"userId":"test"}'

# Verificar diretório uploads
ls -la /root/primecamp-ofc/server/uploads
```

---

**Caminho:** `/root/primecamp-ofc`

