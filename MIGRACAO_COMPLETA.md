# Guia Completo de Migração Supabase → PostgreSQL

## 📋 Visão Geral

Este guia explica como migrar completamente do Supabase para PostgreSQL direto no seu VPS.

## 🎯 Estrutura Criada

1. **API Backend** (`server/`) - Servidor Express.js que conecta ao PostgreSQL
2. **Cliente API** (`src/integrations/postgres/api-client.ts`) - Cliente para o frontend
3. **Cliente PostgreSQL** (`src/integrations/postgres/client.ts`) - Para uso direto no backend

## 🚀 Passo a Passo

### 1. Instalar Dependências da API

```bash
cd server
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie/atualize o arquivo `.env` na raiz do projeto:

```env
# PostgreSQL
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false

# API Backend
VITE_API_URL=http://localhost:3000/api
VITE_API_HOST=localhost
VITE_API_PORT=3000
VITE_API_PROTOCOL=http
VITE_API_ORIGIN=http://localhost:8080

# Modo de operação
VITE_DB_MODE=postgres
```

### 3. Iniciar a API Backend

```bash
cd server
npm run dev
```

A API estará rodando em `http://localhost:3000`

### 4. Testar Conexão

```bash
curl http://localhost:3000/health
```

Deve retornar:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### 5. Migrar Dados do Supabase

#### Exportar do Supabase

```bash
# Conectar ao Supabase e exportar
pg_dump -h db.gogxicjaqpqbhsfzutij.supabase.co \
  -U postgres \
  -d postgres \
  --schema=public \
  > backup_supabase.sql
```

#### Importar no PostgreSQL

```bash
# Importar no seu PostgreSQL
psql -h 72.62.106.76 \
  -U postgres \
  -d banco_gestao \
  < backup_supabase.sql
```

### 6. Atualizar Código do Frontend

#### Opção A: Usar Cliente API (Recomendado)

Substituir imports do Supabase:

**Antes:**
```typescript
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.from('ordens_servico').select('*');
```

**Depois:**
```typescript
import { from } from '@/integrations/postgres/api-client';
const { data } = await from('ordens_servico').select('*').execute();
```

#### Opção B: Criar Wrapper de Compatibilidade

Criar um arquivo `src/integrations/db/client.ts`:

```typescript
import { from as postgresFrom } from '@/integrations/postgres/api-client';
import { supabase } from '@/integrations/supabase/client';

const DB_MODE = import.meta.env.VITE_DB_MODE || 'supabase';

export const from = (tableName: string) => {
  if (DB_MODE === 'postgres') {
    return postgresFrom(tableName);
  }
  return supabase.from(tableName);
};
```

Então usar:
```typescript
import { from } from '@/integrations/db/client';
const { data } = await from('ordens_servico').select('*').execute();
```

### 7. Atualizar Hooks

Exemplo de migração de hook:

**Antes (`useOrdensServicoSupabase.ts`):**
```typescript
const { data: ordens } = await supabase
  .from('ordens_servico')
  .select('*');
```

**Depois:**
```typescript
import { from } from '@/integrations/postgres/api-client';

const { data: ordens } = await from('ordens_servico')
  .select('*')
  .execute();
```

### 8. Lidar com Autenticação

O Supabase fornece autenticação pronta. Para PostgreSQL, você tem duas opções:

#### Opção A: Manter Supabase apenas para Auth

Manter o cliente Supabase apenas para autenticação e usar PostgreSQL para dados:

```typescript
// Auth ainda usa Supabase
import { supabase } from '@/integrations/supabase/client';
await supabase.auth.signInWithPassword({ email, password });

// Dados usam PostgreSQL
import { from } from '@/integrations/postgres/api-client';
const { data } = await from('ordens_servico').select('*').execute();
```

#### Opção B: Implementar Auth própria

Criar sistema de autenticação com JWT:

1. Criar endpoints de auth na API (`/api/auth/login`, `/api/auth/register`)
2. Implementar JWT no backend
3. Atualizar `AuthContext.tsx` para usar a nova API

### 9. Deploy da API

#### Usando PM2

```bash
npm install -g pm2
cd server
pm2 start index.js --name primecamp-api
pm2 save
pm2 startup
```

#### Usando Docker

Criar `server/Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

#### Usando Nginx como Reverse Proxy

Configurar Nginx:

```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## ⚠️ Considerações Importantes

### 1. Row Level Security (RLS)

O Supabase tem RLS nativo. No PostgreSQL direto, você precisa:

- Implementar verificação de permissões no backend
- Passar token de autenticação nas requisições
- Validar permissões antes de executar queries

### 2. Storage

O Supabase Storage não está disponível. Opções:

- Usar sistema de arquivos do servidor
- Integrar com AWS S3
- Usar Cloudinary ou similar
- Criar endpoint de upload na API

### 3. Real-time

O Supabase tem subscriptions em tempo real. Alternativas:

- Usar polling no frontend
- Implementar WebSockets na API
- Usar Socket.io ou similar

### 4. Migrations

O Supabase gerencia migrations automaticamente. Para PostgreSQL:

- Usar ferramentas como `node-pg-migrate`
- Ou manter scripts SQL manualmente

## 📊 Checklist de Migração

- [ ] Instalar dependências da API
- [ ] Configurar variáveis de ambiente
- [ ] Iniciar API backend
- [ ] Testar conexão com PostgreSQL
- [ ] Exportar dados do Supabase
- [ ] Importar dados no PostgreSQL
- [ ] Atualizar código do frontend
- [ ] Migrar hooks de dados
- [ ] Implementar autenticação (se necessário)
- [ ] Implementar RLS/permissões
- [ ] Migrar storage (se necessário)
- [ ] Testar todas as funcionalidades
- [ ] Deploy da API
- [ ] Atualizar documentação

## 🔍 Troubleshooting

### Erro de Conexão

```bash
# Verificar se PostgreSQL está acessível
psql -h 72.62.106.76 -U postgres -d banco_gestao
```

### Erro CORS

Verificar se `VITE_API_ORIGIN` está configurado corretamente na API.

### Erro de Autenticação

Verificar se as credenciais do PostgreSQL estão corretas no `.env`.

## 📞 Próximos Passos

1. Testar API localmente
2. Migrar uma tabela por vez
3. Testar cada funcionalidade
4. Fazer deploy gradual
5. Monitorar performance

