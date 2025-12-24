# 🚀 Deploy da Migração de Autenticação no VPS

## ✅ MUDANÇAS COMMITADAS E ENVIADAS PARA O GIT

Todas as mudanças foram commitadas e enviadas para o repositório.

## 📋 PASSOS NO VPS:

### 1. Atualizar Código do Git

```bash
cd /root/primecamp-ofc
git pull origin main
```

### 2. Instalar Dependências do Servidor (se necessário)

```bash
cd /root/primecamp-ofc/server
npm install
```

Isso vai instalar `bcrypt` e `jsonwebtoken` se ainda não estiverem instalados.

### 3. Rebuild do Frontend

```bash
cd /root/primecamp-ofc
npm run build
sudo cp -r dist/* /var/www/html/
```

### 4. Reiniciar API (se necessário)

```bash
pm2 restart primecamp-api
```

### 5. Verificar se API está funcionando

```bash
curl http://localhost:3000/health
# ou
curl http://api.primecamp.cloud/health
```

Deve retornar: `{"status":"ok","database":"connected"}`

## 🔍 VERIFICAR SE FUNCIONOU:

### No Navegador:

1. **Limpar localStorage:**
   ```javascript
   Object.keys(localStorage).forEach(key => {
     if (key.includes('supabase') || key.includes('sb-')) {
       localStorage.removeItem(key);
     }
   });
   ```

2. **Hard Refresh:** `Ctrl + Shift + R`

3. **Acessar:** `https://primecamp.cloud/auth`

4. **Fazer login:**
   - Email: `admin@primecamp.com`
   - Senha: Sua senha

5. **Verificar Console (F12 → Network):**
   - ❌ **NÃO deve** aparecer `supabase.co/auth/v1/token`
   - ✅ **Deve** aparecer `api.primecamp.cloud/api/auth/login`

## ✅ CHECKLIST:

- [ ] `git pull origin main` executado
- [ ] `npm install` no servidor (se necessário)
- [ ] `npm run build` executado
- [ ] Arquivos copiados para `/var/www/html/`
- [ ] API reiniciada (se necessário)
- [ ] Login testado
- [ ] Console verificado (sem requisições Supabase Auth)

## 🎯 RESULTADO ESPERADO:

Após seguir todos os passos:
- ✅ Login funciona via nova API PostgreSQL
- ✅ Token salvo como `auth_token`
- ✅ **ZERO** requisições para Supabase Auth
- ✅ Profile carregado do PostgreSQL

