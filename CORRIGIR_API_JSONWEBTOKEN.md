# 🔧 Corrigir Erro da API: jsonwebtoken não encontrado

## ❌ PROBLEMA:

A API está crashando porque falta `jsonwebtoken`:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'jsonwebtoken' imported from /root/primecamp-ofc/server/index.js
```

## ✅ SOLUÇÃO:

### No VPS, execute:

```bash
cd /root/primecamp-ofc/server
npm install
```

Isso vai instalar `jsonwebtoken` e `bcrypt` que estão no `package.json` mas não foram instalados.

### Verificar se instalou:

```bash
npm list jsonwebtoken bcrypt
```

Deve mostrar as versões instaladas.

### Reiniciar API:

```bash
pm2 restart primecamp-api
```

### Verificar se está funcionando:

```bash
pm2 logs primecamp-api --lines 20
```

Não deve aparecer mais erros de `jsonwebtoken`.

### Testar API:

```bash
curl http://localhost:3000/health
```

Deve retornar: `{"status":"ok","database":"connected"}`

