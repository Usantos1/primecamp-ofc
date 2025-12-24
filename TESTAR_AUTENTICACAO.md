# 🧪 Testar Autenticação - Próximos Passos

## ✅ O QUE JÁ FOI FEITO:

1. ✅ Tabela `users` criada no PostgreSQL
2. ✅ Usuário admin criado (`admin@primecamp.com`)
3. ✅ API reiniciada com PM2
4. ✅ Frontend buildado

## 🔍 VERIFICAÇÕES NECESSÁRIAS:

### 1. Verificar se o Profile foi criado

Execute no PostgreSQL:

```sql
SELECT * FROM profiles WHERE user_id = (SELECT id FROM users WHERE email = 'admin@primecamp.com');
```

Se não retornar nada, crie o profile:

```sql
INSERT INTO profiles (user_id, display_name, role, approved, approved_at)
SELECT id, 'Admin', 'admin', true, NOW()
FROM users WHERE email = 'admin@primecamp.com';
```

### 2. Verificar se a API está funcionando

```bash
curl http://localhost:3000/health
# ou
curl http://api.primecamp.cloud/health
```

Deve retornar: `{"status":"ok","database":"connected"}`

### 3. Testar Login via API (opcional)

```bash
curl -X POST http://api.primecamp.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@primecamp.com","password":"sua_senha_aqui"}'
```

Deve retornar um token JWT.

## 🌐 TESTAR NO FRONTEND:

### 1. Acessar a página de login

Abra no navegador:
```
https://primecamp.cloud/auth
```

### 2. Fazer Login

- **Email:** `admin@primecamp.com`
- **Senha:** A senha que você usou ao criar o hash

### 3. Verificar se funcionou

- ✅ Deve redirecionar para `/` (dashboard)
- ✅ Deve mostrar seu nome no sidebar
- ✅ Deve ter acesso às funcionalidades

## 🔧 SE NÃO FUNCIONAR:

### Erro: "Email ou senha incorretos"

1. Verifique se o usuário existe:
```sql
SELECT * FROM users WHERE email = 'admin@primecamp.com';
```

2. Verifique se o hash da senha está correto. Se não, recrie:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('sua_senha', 10).then(h => console.log(h))"
```

3. Atualize no banco:
```sql
UPDATE users 
SET password_hash = 'novo_hash_aqui'
WHERE email = 'admin@primecamp.com';
```

### Erro: "Token de autenticação necessário"

1. Verifique se `VITE_API_URL` está correto no `.env`:
```env
VITE_API_URL=http://api.primecamp.cloud/api
```

2. Rebuild o frontend:
```bash
npm run build
```

### Erro: "Failed to fetch"

1. Verifique se a API está rodando:
```bash
pm2 status
```

2. Verifique os logs da API:
```bash
pm2 logs primecamp-api
```

3. Verifique se o CORS está configurado corretamente no `server/index.js`

## 📝 PRÓXIMOS PASSOS APÓS LOGIN FUNCIONAR:

1. ✅ Testar login
2. ✅ Verificar se dados são buscados do PostgreSQL (não Supabase)
3. ⚠️ Migrar criação de usuários em `UserManagement.tsx` (opcional)
4. ⚠️ Implementar reset de senha (opcional)

## 🎯 CHECKLIST FINAL:

- [ ] Profile do admin criado
- [ ] API respondendo (`/health`)
- [ ] Login funcionando no frontend
- [ ] Dados sendo buscados do PostgreSQL
- [ ] Token sendo salvo no localStorage
- [ ] Navegação funcionando após login

