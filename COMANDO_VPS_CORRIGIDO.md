# 🔧 COMANDO CORRIGIDO PARA VPS

**Problemas identificados:**
1. Variáveis `DB_*` não estão no `.env`
2. Comando tentando entrar em `server/` quando já está dentro

---

## ✅ PASSO 1: Adicionar variáveis no .env

```bash
cd /root/primecamp-ofc && nano .env
```

**No nano, adicione estas linhas (no final do arquivo):**

```env
DB_HOST=72.62.106.76
DB_NAME=banco_gestao
DB_USER=postgres
DB_PASSWORD=AndinhoSurf2015@
DB_PORT=5432
DB_SSL=false
JWT_SECRET=seu_jwt_secret_aqui
```

**Salvar:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

## ✅ PASSO 2: Verificar se as variáveis foram adicionadas

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

## ✅ PASSO 3: Testar conexão (COMANDO CORRIGIDO)

**Se você está em `/root/primecamp-ofc/server#`:**

```bash
node test-connection.js
```

**OU se você está em `/root/primecamp-ofc#`:**

```bash
cd server && node test-connection.js
```

---

## ✅ PASSO 4: Reiniciar servidor

**Se você está em `/root/primecamp-ofc/server#`:**

```bash
cd .. && pm2 restart primecamp-api && pm2 logs primecamp-api --lines 30
```

**OU se você está em `/root/primecamp-ofc#`:**

```bash
pm2 restart primecamp-api && pm2 logs primecamp-api --lines 30
```

---

## 🔍 COMANDO ÚNICO COMPLETO (copiar e colar)

```bash
cd /root/primecamp-ofc && \
echo "DB_HOST=72.62.106.76" >> .env && \
echo "DB_NAME=banco_gestao" >> .env && \
echo "DB_USER=postgres" >> .env && \
echo "DB_PASSWORD=AndinhoSurf2015@" >> .env && \
echo "DB_PORT=5432" >> .env && \
echo "DB_SSL=false" >> .env && \
echo "JWT_SECRET=seu_jwt_secret_aqui" >> .env && \
cat .env | grep "^DB_" && \
cd server && \
node test-connection.js && \
cd .. && \
pm2 restart primecamp-api && \
pm2 logs primecamp-api --lines 30
```

**⚠️ IMPORTANTE:** Substitua `seu_jwt_secret_aqui` pelo seu JWT_SECRET real!

---

## 🔍 VERIFICAR ONDE VOCÊ ESTÁ

```bash
pwd
```

- Se mostrar `/root/primecamp-ofc/server` → você está dentro de `server/`
- Se mostrar `/root/primecamp-ofc` → você está na raiz

