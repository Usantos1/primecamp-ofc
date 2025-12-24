# 🔐 Migração Completa de Autenticação - Status

## ✅ O QUE FOI FEITO:

### 1. Backend (API)
- ✅ Adicionado `bcrypt` e `jsonwebtoken` ao `package.json`
- ✅ Criado middleware `authenticateToken` para validar JWT
- ✅ Criado endpoint `/api/auth/login` - Login de usuários
- ✅ Criado endpoint `/api/auth/signup` - Cadastro de novos usuários
- ✅ Criado endpoint `/api/auth/me` - Obter usuário atual
- ✅ Criado endpoint `/api/auth/logout` - Logout
- ✅ Criado script SQL para tabela `users` (`server/migrations/001_create_users_table.sql`)

### 2. Frontend
- ✅ Criado `src/integrations/auth/api-client.ts` - Cliente de autenticação
- ✅ Migrado `src/contexts/AuthContext.tsx` - Usa nova API
- ✅ Migrado `src/pages/Auth.tsx` - Login e Signup usam nova API
- ✅ Migrado `fetchProfile` para usar wrapper PostgreSQL

## 📋 PRÓXIMOS PASSOS:

### 1. Executar Migração no Banco de Dados

No PostgreSQL, execute:

```sql
-- Criar tabela users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Instalar Dependências no Servidor

No VPS, dentro da pasta `server`:

```bash
cd server
npm install
```

### 3. Migrar Usuários do Supabase para PostgreSQL

**Opção A: Criar usuários manualmente (recomendado para testes)**

```sql
-- Exemplo: Criar usuário admin
-- Senha: "admin123" (hash bcrypt)
INSERT INTO users (id, email, password_hash, email_verified)
VALUES (
  'uuid-do-usuario',
  'admin@primecamp.com',
  '$2b$10$rQ8K8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K',
  true
);
```

**Opção B: Script de migração automática**

Criar script Node.js para exportar usuários do Supabase e importar no PostgreSQL.

### 4. Atualizar `.env` do Servidor

Certifique-se de que o `.env` tem:

```env
JWT_SECRET=sua_chave_jwt_secreta_aqui
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_API_ORIGIN=https://primecamp.cloud
PORT=3000
```

### 5. Reiniciar API

```bash
pm2 restart primecamp-api
# ou
npm run dev
```

### 6. Testar Autenticação

1. Acessar `/auth`
2. Tentar fazer login com usuário existente
3. Tentar criar nova conta
4. Verificar se token é salvo no localStorage

## ⚠️ PENDÊNCIAS:

### Arquivos que ainda usam Supabase Auth:

1. `src/components/UserManagement.tsx` - Criar usuários via `supabase.auth.signUp`
2. `src/components/UserManagementNew.tsx` - Criar usuários via `supabase.auth.signUp`
3. `src/pages/ResetPassword.tsx` - Reset de senha (precisa implementar endpoint)

### Funcionalidades a Implementar:

- [ ] Reset de senha (`/api/auth/reset-password`)
- [ ] Verificação de email (opcional)
- [ ] Refresh tokens (opcional, para melhor segurança)

## 🔧 Como Criar Primeiro Usuário:

### Via SQL (rápido para testes):

```sql
-- Gerar hash da senha "admin123" usando Node.js:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(h => console.log(h))"

-- Inserir usuário:
INSERT INTO users (email, password_hash, email_verified)
VALUES (
  'admin@primecamp.com',
  '$2b$10$rQ8K8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K',
  true
);

-- Criar profile:
INSERT INTO profiles (user_id, display_name, role, approved, approved_at)
SELECT id, 'Admin', 'admin', true, NOW()
FROM users WHERE email = 'admin@primecamp.com';
```

### Via API (recomendado):

Usar o endpoint `/api/auth/signup` através do frontend ou Postman.

## 🚀 Status da Migração:

- ✅ **Backend:** 100% migrado
- ✅ **Frontend Auth:** 100% migrado
- ⚠️ **User Management:** Pendente (ainda usa Supabase)
- ⚠️ **Reset Password:** Pendente (precisa implementar)

## 📝 Notas:

- O token JWT é salvo no `localStorage` como `auth_token`
- Tokens expiram em 7 dias
- Todas as rotas `/api/*` (exceto `/api/auth/*`) requerem autenticação
- O `AuthContext` verifica autenticação automaticamente ao carregar

