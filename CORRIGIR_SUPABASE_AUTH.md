# 🔧 Corrigir Requisições Supabase Auth

## ❌ PROBLEMA IDENTIFICADO:

O frontend ainda está fazendo requisições para Supabase Auth:
- `POST https://gogxicjaqpqbhsfzutij.supabase.co/auth/v1/token` (400 Bad Request)

Isso acontece porque o Supabase client está configurado com `autoRefreshToken: true`, que tenta renovar tokens automaticamente.

## ✅ SOLUÇÃO APLICADA:

1. **Desabilitado auto-refresh no Supabase client:**
   - `autoRefreshToken: false`
   - `persistSession: false`
   - `detectSessionInUrl: false`

2. **Criado wrapper deprecated para `auth`:**
   - Qualquer código que ainda tente usar `supabase.auth` receberá um erro claro
   - Força uso da nova API de autenticação

## 📋 PRÓXIMOS PASSOS:

### 1. Rebuild do Frontend

```bash
cd /root/primecamp-ofc
npm run build
sudo cp -r dist/* /var/www/html/
```

### 2. Limpar localStorage do Navegador

No navegador, abra o Console (F12) e execute:

```javascript
// Limpar tokens do Supabase
localStorage.removeItem('sb-gogxicjaqpqbhsfzutij-auth-token');
localStorage.removeItem('sb-gogxicjaqpqbhsfzutij-auth-token-code-verifier');

// Manter apenas o token da nova API
// auth_token deve permanecer se você já fez login
```

### 3. Fazer Login Novamente

1. Acesse: `https://primecamp.cloud/auth`
2. Faça login com:
   - Email: `admin@primecamp.com`
   - Senha: Sua senha

### 4. Verificar Console

Após login, o console deve mostrar:
- ✅ `[DB Client] ✅ Usando PostgreSQL para tabela: ...`
- ✅ `Profile fetched: {...}`
- ❌ **NÃO deve** ter mais requisições para `supabase.co/auth/v1/token`

## 🔍 Verificar se Funcionou:

1. Abra o Console do navegador (F12)
2. Vá na aba "Network" (Rede)
3. Filtre por "supabase"
4. **Não deve** aparecer requisições para `/auth/v1/token`

## ⚠️ Se Ainda Aparecer Requisições Supabase:

Pode ser que algum componente ainda esteja usando Supabase Auth diretamente. Procure por:

```bash
# No código fonte, procurar por:
grep -r "supabase.auth" src/
grep -r "from.*supabase.*client" src/
```

E migre esses arquivos para usar `authAPI` de `@/integrations/auth/api-client`.

