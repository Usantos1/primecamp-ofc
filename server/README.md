# Prime Camp API Backend

API REST para conectar o frontend ao PostgreSQL.

## 🚀 Instalação

```bash
cd server
npm install
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do projeto (não no diretório server) com:

```env
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false
VITE_API_ORIGIN=http://localhost:8080
PORT=3000
JWT_SECRET=your_jwt_secret_here_change_in_production

# Opcional: URL base para arquivos de storage
# Se não definido, usa http://localhost:3000/uploads
STORAGE_BASE_URL=http://localhost:3000/uploads
```

## 🏃 Executar

### Desenvolvimento (com auto-reload)
```bash
npm run dev
```

### Produção
```bash
npm start
```

## 📡 Endpoints

### Health Check
```
GET /health
```

### Query (SELECT)
```
POST /api/query/:table
Body: {
  select: "*" | ["campo1", "campo2"],
  where: { campo: valor, campo2__gt: valor },
  orderBy: { field: "campo", ascending: true },
  limit: 10,
  offset: 0
}
```

### Insert
```
POST /api/insert/:table
Body: { campo1: valor1, campo2: valor2 }
```

### Update
```
POST /api/update/:table
Body: {
  data: { campo: novoValor },
  where: { id: 123 }
}
```

### Delete
```
POST /api/delete/:table
Body: {
  where: { id: 123 }
}
```

### RPC (Stored Procedures)
```
POST /api/rpc/:function_name
Body: {
  params: [param1, param2]
}
```

## 🔒 Segurança

- Helmet para headers de segurança
- CORS configurado
- Rate limiting (100 req/15min por IP)
- Validação de WHERE clause obrigatória em UPDATE/DELETE

## 📝 Exemplos

### Select com WHERE
```bash
curl -X POST http://localhost:3000/api/query/ordens_servico \
  -H "Content-Type: application/json" \
  -d '{
    "select": "*",
    "where": { "status": "aberta" },
    "orderBy": { "field": "data_entrada", "ascending": false },
    "limit": 10
  }'
```

### Insert
```bash
curl -X POST http://localhost:3000/api/insert/ordens_servico \
  -H "Content-Type: application/json" \
  -d '{
    "numero": 1,
    "status": "aberta",
    "data_entrada": "2025-01-01"
  }'
```

### Update
```bash
curl -X POST http://localhost:3000/api/update/ordens_servico \
  -H "Content-Type: application/json" \
  -d '{
    "data": { "status": "fechada" },
    "where": { "id": "123" }
  }'
```

### Delete
```bash
curl -X POST http://localhost:3000/api/delete/ordens_servico \
  -H "Content-Type: application/json" \
  -d '{
    "where": { "id": "123" }
  }'
```

