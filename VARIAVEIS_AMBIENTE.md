# 🔧 VARIÁVEIS DE AMBIENTE

## 📋 Variáveis Obrigatórias

### Banco de Dados PostgreSQL
```env
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false
```

### Servidor
```env
PORT=3000
JWT_SECRET=your_jwt_secret_here_change_in_production
```

### CORS
```env
VITE_API_ORIGIN=http://localhost:8080
```

---

## 📋 Variáveis Opcionais

### Storage Base URL
```env
# Opcional: URL base para arquivos de storage
# Se não definido, usa http://localhost:3000/uploads automaticamente
STORAGE_BASE_URL=http://localhost:3000/uploads
```

**Comportamento:**
- ✅ **Se não definido:** Usa `http://localhost:${PORT}/uploads` automaticamente
- ✅ **Se definido:** Usa o valor configurado
- ✅ **Em produção:** Configure com sua URL pública (ex: `https://api.primecamp.cloud/uploads`)

**Exemplo de uso:**
```env
# Desenvolvimento local (padrão)
# STORAGE_BASE_URL não precisa ser definido

# Produção
STORAGE_BASE_URL=https://api.primecamp.cloud/uploads

# Com CDN
STORAGE_BASE_URL=https://cdn.primecamp.cloud/uploads
```

---

## 📝 Arquivo .env Completo

```env
# ============================================
# BANCO DE DADOS
# ============================================
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false

# ============================================
# SERVIDOR
# ============================================
PORT=3000
JWT_SECRET=your_jwt_secret_here_change_in_production

# ============================================
# CORS
# ============================================
VITE_API_ORIGIN=http://localhost:8080

# ============================================
# STORAGE (OPCIONAL)
# ============================================
# Se não definido, usa http://localhost:3000/uploads
# STORAGE_BASE_URL=http://localhost:3000/uploads
```

---

## ✅ Validação

O código já tem **fallback automático** para `STORAGE_BASE_URL`:

```javascript
// server/index.js linha 769
const baseUrl = process.env.STORAGE_BASE_URL || `http://localhost:${PORT}/uploads`;
```

**Isso significa:**
- ✅ Funciona **sem** definir `STORAGE_BASE_URL` (usa localhost)
- ✅ Funciona **com** `STORAGE_BASE_URL` definido (usa o valor configurado)
- ✅ Não precisa criar a variável se estiver em desenvolvimento local

---

## 🚀 Configuração por Ambiente

### Desenvolvimento Local
```env
# Não precisa definir STORAGE_BASE_URL
# O código usa automaticamente: http://localhost:3000/uploads
```

### Produção
```env
STORAGE_BASE_URL=https://api.primecamp.cloud/uploads
```

### Com S3/GCS/Drive
```env
# Se integrar com storage externo, configure a URL pública
STORAGE_BASE_URL=https://s3.amazonaws.com/seu-bucket/uploads
# ou
STORAGE_BASE_URL=https://storage.googleapis.com/seu-bucket/uploads
```

---

## ⚠️ Nota Importante

A variável `STORAGE_BASE_URL` é **100% opcional**. O código funciona perfeitamente sem ela em desenvolvimento local. Configure apenas se precisar de uma URL diferente em produção.

