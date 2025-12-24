# 🔐 Plano Completo: Migração de Autenticação

## ✅ Status Atual:

- **Dados:** ✅ 100% PostgreSQL (produtos, clientes, OS, marcas/modelos)
- **Profiles:** ✅ Migrado para usar wrapper (agora usa PostgreSQL)
- **Autenticação:** ❌ Ainda usa Supabase (`supabase.auth`)

## 🎯 Objetivo:

Migrar completamente do Supabase Auth para autenticação própria no PostgreSQL.

## 📋 Etapas da Migração:

### ✅ ETAPA 1: Migrar `profiles` (FEITO)
- [x] Migrar `fetchProfile` em `AuthContext.tsx` para usar wrapper
- [ ] Migrar outros lugares que usam `supabase.from('profiles')` (37 arquivos)

### 🔄 ETAPA 2: Criar Sistema de Autenticação Próprio

#### 2.1. Criar Tabela `users` no PostgreSQL

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

#### 2.2. Migrar Usuários do Supabase para PostgreSQL

Script de migração necessário para copiar usuários existentes.

#### 2.3. Criar Endpoints de Autenticação na API

**`server/index.js` - Adicionar:**

```javascript
// Endpoints de autenticação
app.post('/api/auth/login', async (req, res) => {
  // Validar email/senha
  // Gerar JWT token
  // Retornar token + user data
});

app.post('/api/auth/signup', async (req, res) => {
  // Criar novo usuário
  // Hash da senha (bcrypt)
  // Criar profile
  // Retornar token + user data
});

app.post('/api/auth/logout', async (req, res) => {
  // Invalidar token (se usar refresh tokens)
  // Retornar sucesso
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  // Retornar dados do usuário atual
});

app.post('/api/auth/refresh', async (req, res) => {
  // Refresh token (opcional)
});
```

#### 2.4. Instalar Dependências

```bash
npm install bcrypt jsonwebtoken
```

### 🔄 ETAPA 3: Migrar Frontend

#### 3.1. Criar Hook de Autenticação Customizado

**`src/hooks/useAuthCustom.ts`** (novo arquivo)

#### 3.2. Migrar `AuthContext.tsx`

- Remover dependência de `supabase.auth`
- Usar endpoints da API própria
- Gerenciar tokens JWT no localStorage

#### 3.3. Migrar `Auth.tsx`

- Usar novos endpoints de login/signup
- Remover chamadas ao Supabase

#### 3.4. Migrar `UserManagement.tsx` e `UserManagementNew.tsx`

- Criar usuários via API própria
- Remover `supabase.auth.signUp`

## 🚀 Próximos Passos Imediatos:

1. ✅ Migrar `fetchProfile` (FEITO)
2. Migrar outros 37 arquivos que usam `supabase.from('profiles')`
3. Criar tabela `users` no PostgreSQL
4. Implementar endpoints de auth na API
5. Migrar frontend

## ⚠️ Considerações:

- **Senhas:** Precisa migrar hash de senhas do Supabase (pode ser complexo)
- **Sessões:** Gerenciar tokens JWT no frontend
- **Refresh Tokens:** Implementar se necessário
- **Email Verification:** Implementar se necessário

## 📝 Arquivos que Precisam Migrar `profiles`:

1. `src/contexts/AuthContext.tsx` ✅ (FEITO)
2. `src/components/UserManagement.tsx`
3. `src/components/UserManagementNew.tsx`
4. `src/hooks/useUsers.ts`
5. `src/hooks/useWhatsApp.ts`
6. `src/hooks/useTasks.ts`
7. `src/hooks/useGoals.ts`
8. `src/components/NotificationManager.tsx`
9. `src/components/DepartmentManager.tsx`
10. `src/pages/Reports.tsx`
11. ... e mais 27 arquivos

## 🔧 Comando para Migrar Todos:

Posso criar um script para migrar todos os `supabase.from('profiles')` para `from('profiles')` automaticamente.

