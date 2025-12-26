# 🔧 RESOLVER ERROS NA VPS

**Erros identificados:**
1. `EADDRINUSE: address already in use :::3000` - Porta 3000 já está em uso
2. `SyntaxError: Unexpected token ':'` - Erro de sintaxe

---

## ✅ PASSO 1: Verificar se variáveis foram adicionadas

```bash
cd /root/primecamp-ofc && cat .env | grep "^DB_"
```

**Deve mostrar:**
```
DB_HOST=72.62.106.76
DB_NAME=banco_gestao
DB_USER=postgres
DB_PASSWORD=AndinhoSurf2015@
DB_PORT=5432
DB_SSL=false
```

---

## ✅ PASSO 2: Parar todos os processos PM2

```bash
pm2 stop all
pm2 delete all
```

---

## ✅ PASSO 3: Verificar se há processo usando porta 3000

```bash
lsof -i :3000
```

**OU**

```bash
netstat -tulpn | grep :3000
```

**Se houver processo, mate-o:**
```bash
kill -9 $(lsof -t -i:3000)
```

---

## ✅ PASSO 4: Verificar sintaxe do código

```bash
cd /root/primecamp-ofc/server && node --check index.js
```

**Se der erro de sintaxe, verifique o arquivo:**
```bash
nano index.js
```

**Procure por dois pontos (`:`) sem contexto ou vírgulas faltando.**

---

## ✅ PASSO 5: Testar conexão

```bash
cd /root/primecamp-ofc/server && node test-connection.js
```

**Se funcionar, continue. Se não, verifique o erro.**

---

## ✅ PASSO 6: Iniciar servidor novamente

```bash
cd /root/primecamp-ofc/server && \
pm2 start index.js --name primecamp-api && \
pm2 logs primecamp-api --lines 30
```

---

## 🔍 COMANDO COMPLETO (copiar e colar)

```bash
cd /root/primecamp-ofc && \
cat .env | grep "^DB_" && \
echo "" && \
echo "🛑 Parando processos PM2..." && \
pm2 stop all && \
pm2 delete all && \
echo "🔍 Verificando porta 3000..." && \
lsof -i :3000 || echo "✅ Porta 3000 livre" && \
echo "🔍 Verificando sintaxe..." && \
cd server && \
node --check index.js && \
echo "✅ Sintaxe OK!" && \
echo "🧪 Testando conexão..." && \
node test-connection.js && \
echo "🚀 Iniciando servidor..." && \
cd .. && \
pm2 start server/index.js --name primecamp-api && \
pm2 logs primecamp-api --lines 30
```

---

## ⚠️ SE DER ERRO DE SINTAXE

Verifique o arquivo `server/index.js` na linha mencionada no erro. O erro `Unexpected token ':'` geralmente indica:
- Objeto malformado
- Vírgula faltando
- Dois pontos em lugar errado

