# 🔐 Migração de Autenticação: Supabase → PostgreSQL

## 📊 Status Atual:

✅ **Dados:** 100% PostgreSQL (produtos, clientes, OS, marcas/modelos)
❌ **Autenticação:** Ainda usa Supabase (`supabase.auth`)

## 🎯 O que precisa migrar:

1. **Login/Signup** (`src/pages/Auth.tsx`)
2. **AuthContext** (`src/contexts/AuthContext.tsx`)
3. **Profile fetching** (ainda usa `supabase.from('profiles')`)
4. **User Management** (criação de usuários)

## 🔧 Solução: Criar API de Autenticação no PostgreSQL

### Opção 1: Autenticação Própria (Recomendado)

Criar sistema de autenticação completo no PostgreSQL:

1. **Tabela `users` no PostgreSQL:**
   - `id` (UUID)
   - `email` (unique)
   - `password_hash` (bcrypt)
   - `created_at`
   - `updated_at`

2. **Tabela `profiles` no PostgreSQL:**
   - Já existe? Verificar se precisa migrar

3. **Endpoints na API:**
   - `POST /api/auth/login` - Login
   - `POST /api/auth/signup` - Cadastro
   - `POST /api/auth/logout` - Logout
   - `GET /api/auth/me` - Obter usuário atual
   - `POST /api/auth/refresh` - Refresh token

4. **JWT Tokens:**
   - Usar `jsonwebtoken` (já configurado)
   - Gerar tokens no login
   - Validar tokens em todas as requisições

### Opção 2: Manter Supabase Auth Temporariamente

Manter autenticação no Supabase mas migrar `profiles`:

- ✅ Mais rápido
- ✅ Menos trabalho
- ⚠️ Ainda depende do Supabase

## 📋 Plano de Migração Completa:

### Fase 1: Preparar Banco de Dados

1. Criar tabela `users` no PostgreSQL
2. Migrar usuários do Supabase para PostgreSQL
3. Criar tabela `sessions` (se necessário)

### Fase 2: Criar API de Autenticação

1. Implementar endpoints de auth no `server/index.js`
2. Usar `bcrypt` para hash de senhas
3. Usar `jsonwebtoken` para tokens

### Fase 3: Migrar Frontend

1. Migrar `AuthContext.tsx`
2. Migrar `Auth.tsx`
3. Migrar `fetchProfile` para usar wrapper
4. Atualizar todos os lugares que usam `supabase.auth`

## 🚀 Próximos Passos:

1. Verificar se tabela `profiles` existe no PostgreSQL
2. Criar tabela `users` se não existir
3. Implementar endpoints de auth na API
4. Migrar frontend

