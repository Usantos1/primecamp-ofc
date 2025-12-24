# 🚀 COMANDOS VPS COMPLETOS

## ✅ EXECUTE ESTES COMANDOS NO VPS:

```bash
cd /root/primecamp-ofc

# 1. Fazer pull do código atualizado
git pull origin main

# 2. LIMPAR TUDO
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite

# 3. Rebuildar
npm run build

# 4. Verificar se build funcionou
ls -la dist/index.html

# 5. Verificar se build está limpo (NÃO deve encontrar código Supabase)
grep -r "SUBSCRIBED" dist/assets/*.js 2>/dev/null || echo "✅ Build limpo - sem código Supabase"

# 6. REMOVER assets antigos e copiar novos
sudo rm -rf /var/www/html/assets
sudo cp -r dist/* /var/www/html/

# 7. Verificar se foi copiado corretamente
ls -la /var/www/html/index.html
ls -la /var/www/html/assets/ | head -5

# 8. Recarregar nginx
sudo systemctl reload nginx

# 9. Verificar se nginx está rodando
sudo systemctl status nginx | head -10
```

## 🧹 DEPOIS, NO NAVEGADOR:

### Limpar Service Workers:
1. Abra DevTools (F12)
2. Vá em **Application** > **Service Workers**
3. Clique em **Unregister** em qualquer service worker
4. Vá em **Storage** > **Clear site data**
5. Marque **TUDO** e clique em **Clear site data**

### Limpar no Console:
```javascript
localStorage.clear();
sessionStorage.clear();

indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});

if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}

console.log('✅ TUDO LIMPO! FECHE E ABRA O NAVEGADOR COMPLETAMENTE.');
```

### Hard Refresh:
1. **Feche o navegador completamente**
2. Abra novamente
3. Acesse `https://primecamp.cloud`
4. Abra DevTools (F12)
5. Clique com botão direito no refresh
6. Selecione **"Empty Cache and Hard Reload"**

## ✅ VERIFICAR SE FUNCIONOU:

1. Abra o Console (F12)
2. Vá na aba **Network**
3. Filtre por **"supabase"**
4. **NÃO deve** aparecer NENHUMA requisição

## 🎯 RESULTADO ESPERADO:

- ✅ **ZERO** requisições para `supabase.co`
- ✅ **ZERO** mensagens "SUBSCRIBED"
- ✅ Sistema funcionando 100% via PostgreSQL

