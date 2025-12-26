# 🔧 COMANDO PARA ATUALIZAR .env NA VPS

**Erro:** Variáveis `DB_*` não encontradas no `.env`

---

## ✅ COMANDO COMPLETO

Execute na VPS:

```bash
cd /root/primecamp-ofc && \
nano .env
```

---

## 📝 NO EDITOR NANO

### 1. Adicione estas linhas (se não existirem):

```env
# PostgreSQL Database Configuration (OBRIGATÓRIO)
DB_HOST=72.62.106.76
DB_NAME=banco_gestao
DB_USER=postgres
DB_PASSWORD=AndinhoSurf2015@
DB_PORT=5432
DB_SSL=false

# JWT Secret (OBRIGATÓRIO)
JWT_SECRET=seu_jwt_secret_aqui
```

### 2. Remova ou comente as linhas antigas `VITE_DB_*`:

```env
# Remover ou comentar estas linhas:
# VITE_DB_HOST=72.62.106.76
# VITE_DB_NAME=banco_gestao
# VITE_DB_USER=postgres
# VITE_DB_PASSWORD=AndinhoSurf2015@
# VITE_DB_PORT=5432
# VITE_DB_SSL=false
```

### 3. Salvar:
- `Ctrl+O` (salvar)
- `Enter` (confirmar)
- `Ctrl+X` (sair)

---

## ✅ DEPOIS DE SALVAR, EXECUTE:

```bash
cd server && \
node test-connection.js && \
cd .. && \
pm2 restart primecamp-api && \
pm2 logs primecamp-api --lines 30
```

---

## 🔍 VERIFICAR SE ESTÁ CORRETO

```bash
cat .env | grep "^DB_"
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

## ⚠️ IMPORTANTE

- As variáveis `DB_*` são OBRIGATÓRIAS
- O backend NÃO funciona mais com `VITE_DB_*`
- Se alguma variável `DB_*` estiver faltando, o servidor não inicia

