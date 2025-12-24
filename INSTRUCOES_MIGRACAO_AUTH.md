# 🚀 Instruções: Migração Completa de Autenticação

## ✅ O QUE FOI IMPLEMENTADO:

### Backend:
- ✅ Endpoints de autenticação (`/api/auth/login`, `/api/auth/signup`, `/api/auth/me`, `/api/auth/logout`)
- ✅ Middleware JWT para proteger rotas
- ✅ Hash de senhas com bcrypt
- ✅ Script SQL para criar tabela `users`

### Frontend:
- ✅ Cliente de autenticação (`src/integrations/auth/api-client.ts`)
- ✅ `AuthContext.tsx` migrado para usar nova API
- ✅ `Auth.tsx` migrado (login e signup)

## 📋 PASSOS PARA COLOCAR EM PRODUÇÃO:

### 1. Executar SQL no PostgreSQL

Conecte-se ao PostgreSQL e execute:

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
cd /root/primecamp-ofc/server
npm install
```

Isso vai instalar `bcrypt` e `jsonwebtoken`.

### 3. Criar Primeiro Usuário

**Opção A: Via SQL (rápido)**

Primeiro, gere o hash da senha no servidor:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('sua_senha_aqui', 10).then(h => console.log(h))"
```

Depois, insira no PostgreSQL:

```sql
-- Inserir usuário (substitua o hash gerado acima)
INSERT INTO users (email, password_hash, email_verified)
VALUES (
  'admin@primecamp.com',
  'hash_gerado_acima',
  true
);

-- Criar profile
INSERT INTO profiles (user_id, display_name, role, approved, approved_at)
SELECT id, 'Admin', 'admin', true, NOW()
FROM users WHERE email = 'admin@primecamp.com';
```

**Opção B: Via Frontend**

1. Acesse `/auth`
2. Clique em "Cadastrar"
3. Preencha os dados
4. O usuário será criado automaticamente

### 4. Verificar `.env` do Servidor

Certifique-se de que tem:

```env
JWT_SECRET=ae6cf1f3d6ee17f916d177f3721e16e70285651a829fa017b1137513d373d745231d96ecb14006f938ca6557fdd14b26494085bc6a947c2d7347ba6d29e7085a
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_API_ORIGIN=https://primecamp.cloud
PORT=3000
NODE_ENV=production
```

### 5. Reiniciar API

```bash
pm2 restart primecamp-api
# ou se não estiver usando PM2:
cd /root/primecamp-ofc/server
npm run dev
```

### 6. Rebuild do Frontend

No VPS ou local, rebuild o frontend:

```bash
cd /root/primecamp-ofc
npm run build
```

### 7. Testar

1. Acesse `https://primecamp.cloud/auth`
2. Tente fazer login com o usuário criado
3. Verifique se funciona

## ⚠️ ARQUIVOS QUE AINDA USAM SUPABASE AUTH:

Estes arquivos ainda precisam ser migrados (mas não são críticos para login básico):

- `src/components/UserManagement.tsx` - Criar usuários
- `src/components/UserManagementNew.tsx` - Criar usuários
- `src/pages/ResetPassword.tsx` - Reset de senha

## 🔧 TROUBLESHOOTING:

### Erro: "Token de autenticação necessário"
- Verifique se o token está sendo salvo no localStorage
- Verifique se o header `Authorization: Bearer <token>` está sendo enviado

### Erro: "Email ou senha incorretos"
- Verifique se o usuário existe no banco
- Verifique se o hash da senha está correto

### Erro: "Cannot find module 'bcrypt'"
- Execute `npm install` na pasta `server`

### Frontend não conecta à API
- Verifique `VITE_API_URL` no `.env` do frontend
- Verifique se a API está rodando (`curl http://api.primecamp.cloud/health`)

## 📝 PRÓXIMOS PASSOS (Opcional):

1. Implementar reset de senha (`/api/auth/reset-password`)
2. Migrar `UserManagement.tsx` para criar usuários via API
3. Implementar refresh tokens (melhor segurança)
4. Adicionar verificação de email (opcional)

