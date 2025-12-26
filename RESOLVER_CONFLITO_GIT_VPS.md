# 🔧 RESOLVER CONFLITO GIT NA VPS

**Problema:** Alterações locais em `server/index.js` conflitam com o Git

---

## ✅ SOLUÇÃO RÁPIDA (Descartar alterações locais)

Se as alterações locais não são importantes, descarte-as e use as do Git:

```bash
cd /root/primecamp-ofc && \
git stash && \
git pull origin main && \
nano .env
```

**OU** (se quiser descartar completamente):

```bash
cd /root/primecamp-ofc && \
git checkout -- server/index.js && \
git pull origin main && \
nano .env
```

---

## 🔄 SOLUÇÃO ALTERNATIVA (Salvar alterações locais)

Se quiser salvar as alterações locais antes de atualizar:

```bash
cd /root/primecamp-ofc && \
git stash save "Alterações locais antes do pull" && \
git pull origin main && \
nano .env
```

**Para recuperar depois (se necessário):**
```bash
git stash pop
```

---

## 📋 COMANDO COMPLETO RECOMENDADO

```bash
cd /root/primecamp-ofc && \
git checkout -- server/index.js && \
git pull origin main && \
cp .env .env.backup && \
nano .env
```

**No nano, edite o .env:**
1. Remova todas as linhas `VITE_DB_*`
2. Adicione as variáveis `DB_*`:

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

**Depois execute:**
```bash
cd server && \
npm install && \
node test-connection.js && \
cd .. && \
pm2 restart primecamp-api && \
pm2 logs primecamp-api --lines 30
```

---

## ⚠️ IMPORTANTE

As alterações locais em `server/index.js` na VPS são provavelmente antigas (antes das correções de segurança).

**Recomendação:** Descartar as alterações locais e usar as novas do Git que já têm todas as correções aplicadas.

