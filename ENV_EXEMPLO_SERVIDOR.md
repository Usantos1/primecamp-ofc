# Configuração do Servidor (.env)

Crie o arquivo `server/.env` com o seguinte conteúdo:

```env
# PostgreSQL Database Configuration
DB_HOST=72.62.106.76
DB_NAME=banco_gestao
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_AQUI
DB_PORT=5432
DB_SSL=false

# JWT Secret
JWT_SECRET=SUA_CHAVE_JWT_AQUI

# API Configuration
PORT=3000

# Storage
STORAGE_BASE_URL=https://api.primecamp.cloud/uploads
```

## Comando rápido para criar na VPS:

```bash
cd /root/primecamp-ofc/server

cat > .env << 'EOF'
DB_HOST=72.62.106.76
DB_NAME=banco_gestao
DB_USER=postgres
DB_PASSWORD=AndinhoSurf2015@
DB_PORT=5432
DB_SSL=false
JWT_SECRET=30a40dfec7b0a65dd2add409318015163d3afd8388b8bfed359da26c5a8a5b0d46697854564eed3ff9f3106e5d1f9826342b209d6f628b6d9d7afddbb6668d23
PORT=3000
STORAGE_BASE_URL=https://api.primecamp.cloud/uploads
EOF

pm2 restart all
```

