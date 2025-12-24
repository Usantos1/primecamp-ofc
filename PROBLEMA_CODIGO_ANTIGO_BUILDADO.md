# 🚨 PROBLEMA: CÓDIGO JAVASCRIPT ANTIGO BUILDADO

## ⚠️ CAUSA RAIZ:

As requisições Supabase estão vindo de **código JavaScript antigo** que foi buildado anteriormente e está sendo servido pelo servidor ou em cache no navegador.

## ✅ SOLUÇÃO DEFINITIVA:

### 1. NO VPS - LIMPAR E REBUILDAR TUDO:

```bash
cd /root/primecamp-ofc

# Fazer pull
git pull origin main

# LIMPAR TUDO (CRÍTICO!)
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
rm -rf node_modules/.cache

# Rebuildar
npm run build

# VERIFICAR se build está limpo
echo "Verificando build..."
grep -r "supabase.co/auth/v1/token" dist/assets/*.js 2>/dev/null && echo "❌ ERRO: Build ainda tem Supabase!" || echo "✅ Build limpo"
grep -r "grant_type=password" dist/assets/*.js 2>/dev/null && echo "❌ ERRO: Build ainda tem Supabase Auth!" || echo "✅ Build limpo"

# Se encontrar código Supabase, o build falhou
# Verificar timestamp dos arquivos
ls -lh dist/assets/*.js | head -3

# Copiar para servidor
sudo rm -rf /var/www/html/assets
sudo cp -r dist/* /var/www/html/

# Verificar se foi copiado
ls -lh /var/www/html/assets/*.js | head -3

# Recarregar nginx
sudo systemctl reload nginx
```

### 2. NO NAVEGADOR - LIMPAR TUDO COMPLETAMENTE:

#### Passo 1: Limpar Service Workers
1. Abra DevTools (F12)
2. Vá em **Application** > **Service Workers**
3. Clique em **Unregister** em qualquer service worker
4. Vá em **Storage** > **Clear site data**
5. Marque **TUDO**
6. Clique em **Clear site data**

#### Passo 2: Limpar no Console
No Console (F12), execute:

```javascript
// Limpar localStorage
localStorage.clear();

// Limpar sessionStorage
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

#### Passo 3: Fechar e Abrir Navegador
1. **Feche TODAS as abas** do site
2. **Feche o navegador completamente**
3. Abra novamente
4. Acesse `https://primecamp.cloud`
5. Abra DevTools (F12)
6. Clique com botão direito no refresh
7. Selecione **"Empty Cache and Hard Reload"**

### 3. TESTAR EM JANELA ANÔNIMA:

Para garantir que não há cache:
1. Abra uma janela anônima (Ctrl+Shift+N)
2. Acesse `https://primecamp.cloud`
3. Abra DevTools (F12)
4. Vá na aba **Network**
5. Filtre por **"supabase"**
6. **NÃO deve** aparecer NENHUMA requisição

## ✅ VERIFICAR SE FUNCIONOU:

Após rebuild e limpar cache:

1. Abra o Console (F12)
2. Vá na aba **Network**
3. Filtre por **"supabase"**
4. **NÃO deve** aparecer:
   - ❌ Requisições para `supabase.co/auth/v1/token`
   - ❌ Requisições para `supabase.co/rest/v1/`
   - ❌ WebSocket para `supabase.co`
   - ❌ Mensagens "SUBSCRIBED"

5. **DEVE** aparecer:
   - ✅ Requisições para `api.primecamp.cloud/api/auth/login`
   - ✅ Requisições para `api.primecamp.cloud/api/`

## 🎯 RESULTADO ESPERADO:

- ✅ **ZERO** requisições para `supabase.co`
- ✅ **ZERO** WebSocket Supabase
- ✅ **ZERO** mensagens "SUBSCRIBED"
- ✅ Sistema funcionando 100% via PostgreSQL

## ⚠️ SE AINDA APARECER:

1. Verifique se o build foi feito corretamente (comandos acima)
2. Verifique timestamp dos arquivos (devem ser recentes)
3. Verifique se há código Supabase no build:
   ```bash
   grep -r "supabase.co" /var/www/html/assets/*.js | head -5
   ```
4. Teste em janela anônima
5. Verifique se há Service Workers ativos

## 📋 CHECKLIST FINAL:

- [ ] Build feito com `rm -rf dist` antes
- [ ] Build verificado (sem código Supabase)
- [ ] Arquivos copiados para `/var/www/html/`
- [ ] Timestamp dos arquivos verificado (recentes)
- [ ] Service Workers removidos
- [ ] Cache limpo completamente
- [ ] Navegador fechado e aberto novamente
- [ ] Hard refresh feito
- [ ] Testado em janela anônima
- [ ] Console verificado (sem requisições Supabase)

