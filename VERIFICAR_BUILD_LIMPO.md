# 🔍 VERIFICAR SE BUILD ESTÁ LIMPO

## ⚠️ PROBLEMA:

As mensagens "SUBSCRIBED" vêm de código JavaScript antigo buildado. Mesmo após rebuild, o navegador pode estar usando cache.

## ✅ VERIFICAR NO VPS:

```bash
cd /root/primecamp-ofc

# 1. Verificar se há código Supabase no build
grep -r "SUBSCRIBED" dist/assets/*.js 2>/dev/null | head -5

# Se encontrar algo, significa que o build ainda tem código antigo
# Execute novamente:
rm -rf dist node_modules/.vite .vite
npm run build

# 2. Verificar se há requisições Supabase no código buildado
grep -r "supabase.co/auth/v1/token" dist/assets/*.js 2>/dev/null | head -5

# Se encontrar, rebuild necessário

# 3. Verificar se interceptação está no index.html
grep -r "INTERCEPTAR SUPABASE" dist/index.html

# Deve aparecer a interceptação

# 4. Verificar timestamp dos arquivos
ls -la dist/assets/*.js | head -5

# Os arquivos devem ter timestamp recente (agora)
```

## 🧹 LIMPAR CACHE COMPLETAMENTE:

### No Navegador:

1. **Fechar TODAS as abas** do site
2. Abrir DevTools (F12)
3. Ir em **Application** > **Storage**
4. Clicar em **Clear site data**
5. Marcar **TUDO**
6. Clicar em **Clear site data**
7. **Fechar o navegador completamente**
8. Abrir novamente
9. Acessar `https://primecamp.cloud`
10. Abrir DevTools (F12)
11. Clicar com botão direito no refresh
12. Selecionar **"Empty Cache and Hard Reload"**

### Ou no Console:

```javascript
// Limpar TUDO
localStorage.clear();
sessionStorage.clear();

// Limpar IndexedDB
indexedDB.databases().then(dbs => {
  dbs.forEach(db => {
    indexedDB.deleteDatabase(db.name);
    console.log('✅ IndexedDB deletado:', db.name);
  });
});

// Limpar cache
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log('✅ Cache deletado:', name);
    });
  });
}

// Limpar cookies
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

console.log('✅ TUDO LIMPO! FECHE E ABRA O NAVEGADOR COMPLETAMENTE.');
```

## 🎯 TESTAR EM JANELA ANÔNIMA:

Para garantir que não há cache:
1. Abra uma janela anônima (Ctrl+Shift+N)
2. Acesse `https://primecamp.cloud`
3. Abra DevTools (F12)
4. Vá na aba **Network**
5. Filtre por **"supabase"**
6. **NÃO deve** aparecer NENHUMA requisição

## ✅ RESULTADO ESPERADO:

Após seguir todos os passos:
- ✅ **ZERO** requisições para `supabase.co`
- ✅ **ZERO** mensagens "SUBSCRIBED"
- ✅ Console mostra apenas mensagens do código novo

## ⚠️ SE AINDA APARECER:

1. Verifique se o build foi feito corretamente (comandos acima)
2. Verifique se os arquivos foram copiados para `/var/www/html/`
3. Verifique timestamp dos arquivos (devem ser recentes)
4. Teste em janela anônima
5. Verifique se há Service Workers ativos

