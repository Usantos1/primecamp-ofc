# 🚫 BLOQUEAR TODAS AS REQUISIÇÕES SUPABASE

## ✅ CORREÇÃO APLICADA:

A interceptação agora bloqueia **TODAS** as requisições para Supabase, não apenas Auth:
- ✅ `supabase.co/auth/v1/token` (Auth)
- ✅ `supabase.co/rest/v1/` (REST API)
- ✅ `supabase.co/storage/v1/` (Storage)
- ✅ Qualquer URL contendo `supabase.co`

## 🚀 EXECUTE NO VPS:

```bash
cd /root/primecamp-ofc

# 1. Fazer pull do código atualizado
git pull origin main

# 2. Rebuildar
rm -rf dist node_modules/.vite .vite
npm run build

# 3. Copiar para servidor web
sudo cp -r dist/* /var/www/html/

# 4. Recarregar nginx
sudo systemctl reload nginx
```

## 🧹 LIMPAR CACHE DO NAVEGADOR (CRÍTICO):

**OBRIGATÓRIO:** Limpe completamente o cache:

1. Abra DevTools (F12)
2. Clique com botão direito no refresh
3. Selecione **"Empty Cache and Hard Reload"**

Ou execute no Console:
```javascript
// Limpar TUDO do Supabase
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-') || key.includes('gogxicjaqpqbhsfzutij')) {
    localStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-') || key.includes('gogxicjaqpqbhsfzutij')) {
    sessionStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

// Limpar cookies também
document.cookie.split(";").forEach(c => {
  if (c.includes('supabase') || c.includes('sb-')) {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  }
});

location.reload();
```

## ✅ VERIFICAR SE FUNCIONOU:

Após limpar cache e recarregar:

1. Abra o Console (F12)
2. Vá na aba **Network** (Rede)
3. Filtre por **"supabase"**
4. **NÃO deve** aparecer NENHUMA requisição para `supabase.co`
5. Deve aparecer mensagens de bloqueio no console se algo tentar fazer requisição

## 🎯 RESULTADO ESPERADO:

- ✅ **ZERO** requisições para `supabase.co`
- ✅ Todas as requisições bloqueadas antes de serem enviadas
- ✅ Mensagens de erro no console mostrando o que foi bloqueado
- ✅ Sistema funcionando 100% via PostgreSQL API

