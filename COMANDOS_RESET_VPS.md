# 🔄 COMANDOS PARA RESETAR COMPLETAMENTE A VPS

## O problema:
- Processos antigos ainda rodando
- `EADDRINUSE` = porta 3000 já em uso
- Código antigo pode estar em cache

---

## 📋 EXECUTE ESTES COMANDOS NA ORDEM:

```bash
# 1. PARAR TUDO
pm2 stop all
pm2 delete all

# 2. MATAR QUALQUER PROCESSO NA PORTA 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs -r kill -9

# 3. VERIFICAR SE PORTA ESTÁ LIVRE
lsof -i :3000
# Não deve retornar nada

# 4. IR PARA O DIRETÓRIO
cd /root/primecamp-ofc

# 5. RESETAR CÓDIGO (FORÇAR)
git fetch origin
git reset --hard origin/main

# 6. VERIFICAR SE O CÓDIGO ESTÁ CORRETO
grep -n "responses.filter((r)" server/index.js
# Deve mostrar: responses = responses.filter((r) => r.questionId !== questionId);
# NÃO pode ter ": any" ou ": string"

# 7. INICIAR O SERVIDOR
pm2 start server/index.js --name primecamp-api

# 8. VERIFICAR LOGS
pm2 logs primecamp-api --lines 30

# 9. TESTAR API
curl http://localhost:3000/api/health
```

---

## 🔍 SE AINDA DER ERRO:

Verifique se há TypeScript no código:
```bash
grep -n ": any" server/index.js
grep -n ": string" server/index.js
grep -n "(r:" server/index.js
```

Se encontrar algo, o código não foi atualizado corretamente.

---

## ✅ RESULTADO ESPERADO:

Após executar os comandos:
- `pm2 status` deve mostrar: `primecamp-api | online`
- `curl http://localhost:3000/api/health` deve retornar: `{"status":"ok"}`
- Logs devem mostrar: `✅ Servidor rodando` e `Conectado ao PostgreSQL`

