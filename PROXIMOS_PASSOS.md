# 🎯 Próximos Passos - Testar Autenticação

## ✅ O QUE JÁ FOI FEITO:

1. ✅ Tabela `users` criada
2. ✅ Usuário admin criado (`admin@primecamp.com`)
3. ✅ API reiniciada
4. ✅ Frontend buildado

## 🔍 VERIFICAÇÃO CRÍTICA: Criar Profile do Admin

Execute no PostgreSQL:

```sql
-- Verificar se profile existe
SELECT * FROM profiles WHERE user_id = (SELECT id FROM users WHERE email = 'admin@primecamp.com');

-- Se não existir, criar:
INSERT INTO profiles (user_id, display_name, role, approved, approved_at)
SELECT id, 'Admin', 'admin', true, NOW()
FROM users WHERE email = 'admin@primecamp.com';
```

## 📋 PRÓXIMOS PASSOS:

### 1. Copiar Arquivos Buildados para o Servidor Web

Se você usa Nginx, copie os arquivos da pasta `dist`:

```bash
# Copiar arquivos buildados
sudo cp -r /root/primecamp-ofc/dist/* /var/www/html/

# Ou se usar outro diretório:
sudo cp -r /root/primecamp-ofc/dist/* /caminho/do/seu/servidor/web/
```

### 2. Verificar Variáveis de Ambiente do Frontend

Certifique-se de que o `.env` do frontend tem:

```env
VITE_DB_MODE=postgres
VITE_API_URL=http://api.primecamp.cloud/api
```

**IMPORTANTE:** Se mudou o `.env`, precisa rebuildar:

```bash
cd /root/primecamp-ofc
npm run build
sudo cp -r dist/* /var/www/html/
```

### 3. Testar API

```bash
# Testar health check
curl http://api.primecamp.cloud/health

# Deve retornar: {"status":"ok","database":"connected"}
```

### 4. Testar Login no Frontend

1. Acesse: `https://primecamp.cloud/auth`
2. Faça login com:
   - **Email:** `admin@primecamp.com`
   - **Senha:** A senha que você usou ao criar o hash

### 5. Verificar se Funcionou

Após fazer login:

1. ✅ Deve redirecionar para `/` (dashboard)
2. ✅ Deve mostrar "Admin" no sidebar
3. ✅ Deve ter acesso às funcionalidades
4. ✅ Abra o Console do navegador (F12) e verifique:
   - Não deve ter erros de "Failed to fetch"
   - Deve mostrar `[DB Client] ✅ Usando PostgreSQL`
   - Token deve estar salvo no localStorage como `auth_token`

## 🔧 TROUBLESHOOTING:

### Erro: "Email ou senha incorretos"

**Problema:** Hash da senha não está correto.

**Solução:**
1. Gere novo hash:
```bash
cd /root/primecamp-ofc/server
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('sua_senha_aqui', 10).then(h => console.log(h))"
```

2. Atualize no PostgreSQL:
```sql
UPDATE users 
SET password_hash = 'novo_hash_gerado_acima'
WHERE email = 'admin@primecamp.com';
```

### Erro: "Token de autenticação necessário"

**Problema:** Frontend não está conectando à API correta.

**Solução:**
1. Verifique `VITE_API_URL` no `.env`
2. Rebuild o frontend:
```bash
cd /root/primecamp-ofc
npm run build
sudo cp -r dist/* /var/www/html/
```

### Erro: "Failed to fetch"

**Problema:** API não está acessível ou CORS bloqueado.

**Solução:**
1. Verifique se API está rodando:
```bash
pm2 status
pm2 logs primecamp-api
```

2. Verifique CORS no `server/index.js`:
```javascript
origin: process.env.VITE_API_ORIGIN || 'https://primecamp.cloud'
```

### Frontend mostra dados do Supabase ainda

**Problema:** `VITE_DB_MODE` não está como `postgres`.

**Solução:**
1. Verifique `.env`:
```bash
cat .env | grep VITE_DB_MODE
# Deve mostrar: VITE_DB_MODE=postgres
```

2. Se não estiver, edite e rebuild:
```bash
nano .env
# Adicione: VITE_DB_MODE=postgres
npm run build
sudo cp -r dist/* /var/www/html/
```

## ✅ CHECKLIST FINAL:

- [ ] Profile do admin criado no PostgreSQL
- [ ] Arquivos buildados copiados para servidor web
- [ ] `.env` do frontend com `VITE_DB_MODE=postgres` e `VITE_API_URL` correto
- [ ] Frontend rebuildado após mudanças no `.env`
- [ ] API respondendo (`/health`)
- [ ] Login funcionando
- [ ] Token sendo salvo no localStorage
- [ ] Dados sendo buscados do PostgreSQL (verificar no console)

## 🎉 PRONTO!

Se tudo funcionou, você está 100% migrado do Supabase para PostgreSQL! 🚀
