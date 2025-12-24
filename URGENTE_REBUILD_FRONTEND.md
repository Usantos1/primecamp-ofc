# ⚠️ URGENTE: REBUILD DO FRONTEND NECESSÁRIO

## 🔴 PROBLEMA CRÍTICO:

O código no navegador ainda é a **versão antiga** que tenta usar Supabase Auth. As mudanças que fizemos só terão efeito após **REBUILD**.

## ✅ SOLUÇÃO IMEDIATA:

### No VPS, execute:

```bash
cd /root/primecamp-ofc
npm run build
sudo cp -r dist/* /var/www/html/
```

**Isso é OBRIGATÓRIO!** Sem rebuild, as mudanças não terão efeito.

## 🔍 POR QUE AINDA APARECE SUPABASE AUTH?

O código buildado (`dist/index-*.js`) ainda contém:
- Supabase client com `autoRefreshToken: true` (versão antiga)
- Código que tenta fazer login via Supabase

Mesmo que o código fonte esteja correto, o navegador está executando a versão antiga buildada.

## 📋 CHECKLIST COMPLETO:

### 1. ✅ Rebuild Frontend (OBRIGATÓRIO)

```bash
cd /root/primecamp-ofc
npm run build
sudo cp -r dist/* /var/www/html/
```

### 2. ✅ Limpar Cache do Navegador

No navegador:
- **Chrome/Edge:** `Ctrl + Shift + Delete` → Limpar cache
- Ou: `Ctrl + Shift + R` (Hard Refresh)
- Ou: Fechar e abrir o navegador

### 3. ✅ Limpar localStorage

No Console (F12), execute:

```javascript
// Limpar TODOS os tokens do Supabase
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    localStorage.removeItem(key);
    console.log('Removido:', key);
  }
});
```

### 4. ✅ Testar Login

1. Acesse: `https://primecamp.cloud/auth`
2. Faça login com:
   - Email: `admin@primecamp.com`
   - Senha: Sua senha

### 5. ✅ Verificar Network Tab

No Console → Network:
- ❌ **NÃO deve** aparecer `supabase.co/auth/v1/token`
- ✅ **Deve** aparecer `api.primecamp.cloud/api/auth/login`

## 🎯 RESULTADO ESPERADO:

Após rebuild e limpar cache:
- ✅ Login funciona via nova API
- ✅ Token salvo como `auth_token`
- ✅ **ZERO** requisições para Supabase Auth
- ✅ Profile carregado do PostgreSQL

## ⚠️ SE AINDA NÃO FUNCIONAR:

1. Verifique se o rebuild foi feito:
```bash
ls -lh /var/www/html/index*.js
# Deve mostrar arquivos com data/hora recente
```

2. Verifique se os arquivos foram copiados:
```bash
ls -lh /var/www/html/ | head -20
```

3. Verifique logs do servidor web (Nginx):
```bash
sudo tail -f /var/log/nginx/error.log
```

4. Verifique se a API está respondendo:
```bash
curl http://api.primecamp.cloud/health
```

## 📝 NOTA IMPORTANTE:

O código fonte está correto. O problema é que o navegador está executando código buildado antigo. **REBUILD É OBRIGATÓRIO!**

