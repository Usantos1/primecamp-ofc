# 🔧 Corrigir Problemas - Instruções

## ❌ PROBLEMA 1: bcrypt não instalado

### Solução:

```bash
cd /root/primecamp-ofc/server
npm install
```

Isso vai instalar `bcrypt`, `jsonwebtoken` e outras dependências.

## ❌ PROBLEMA 2: SQL executado no terminal bash

### Solução: Usar psql (cliente PostgreSQL)

**NÃO execute SQL diretamente no terminal bash!**

Use o cliente PostgreSQL:

```bash
# Conectar ao PostgreSQL
psql -U postgres -d banco_gestao

# OU se precisar especificar host:
psql -h 72.62.106.76 -U postgres -d banco_gestao
```

Depois execute os comandos SQL dentro do `psql`:

```sql
-- Criar profile do admin (se não existir)
INSERT INTO profiles (user_id, display_name, role, approved, approved_at)
SELECT id, 'Admin', 'admin', true, NOW()
FROM users WHERE email = 'admin@primecamp.com'
ON CONFLICT (user_id) DO NOTHING;

-- Verificar se foi criado
SELECT * FROM profiles WHERE user_id = (SELECT id FROM users WHERE email = 'admin@primecamp.com');

-- Sair do psql
\q
```

## 🔐 Gerar Hash da Senha Corretamente

**DEPOIS de instalar as dependências:**

```bash
cd /root/primecamp-ofc/server
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('sua_senha_aqui', 10).then(h => console.log(h))"
```

Isso vai gerar um hash como:
```
$2b$10$rQ8K8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K
```

**Copie esse hash completo** (começa com `$2b$10$`).

## 📝 Passo a Passo Completo:

### 1. Instalar dependências:

```bash
cd /root/primecamp-ofc/server
npm install
```

### 2. Gerar hash da senha:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(h => console.log(h))"
```

**Copie o hash gerado** (começa com `$2b$10$`).

### 3. Conectar ao PostgreSQL:

```bash
psql -U postgres -d banco_gestao
```

### 4. Atualizar senha do usuário:

```sql
UPDATE users 
SET password_hash = 'hash_gerado_acima'
WHERE email = 'admin@primecamp.com';
```

### 5. Criar profile (se não existir):

```sql
INSERT INTO profiles (user_id, display_name, role, approved, approved_at)
SELECT id, 'Admin', 'admin', true, NOW()
FROM users WHERE email = 'admin@primecamp.com'
ON CONFLICT (user_id) DO NOTHING;
```

### 6. Verificar:

```sql
SELECT u.email, u.email_verified, p.display_name, p.role, p.approved
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'admin@primecamp.com';
```

### 7. Sair do psql:

```sql
\q
```

## ✅ Depois disso:

1. Reiniciar API (se necessário):
```bash
pm2 restart primecamp-api
```

2. Testar login no frontend:
- Acesse: `https://primecamp.cloud/auth`
- Email: `admin@primecamp.com`
- Senha: A senha que você usou no hash

