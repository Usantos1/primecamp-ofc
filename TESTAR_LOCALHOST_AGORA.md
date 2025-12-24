# ✅ DEPENDÊNCIAS INSTALADAS - TESTAR AGORA

## ✅ STATUS:

- ✅ Dependências do servidor instaladas
- ✅ Pronto para testar em localhost

## 🚀 PRÓXIMOS PASSOS:

### 1. Iniciar o servidor API:

```bash
cd server
npm start
```

Deve aparecer: `API rodando na porta 3000` ou similar

### 2. Em outro terminal, iniciar o frontend:

```bash
# Na raiz do projeto
npm run dev
```

### 3. Abrir no navegador:

1. Abra `http://localhost:5173` (ou a porta que o Vite mostrar)
2. Abra DevTools (F12)
3. Vá na aba **Network**
4. Filtre por **"supabase"**
5. **NÃO deve** aparecer NENHUMA requisição

### 4. Limpar cache do navegador:

No Console (F12), execute:

```javascript
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name)));
if ('caches' in window) caches.keys().then(names => names.forEach(name => caches.delete(name)));
console.log('✅ Cache limpo!');
```

### 5. Hard refresh:

- **Ctrl + Shift + R**

### 6. Testar login:

1. Tente fazer login
2. Verifique o Network tab
3. **NÃO deve** aparecer requisições para `supabase.co`
4. **DEVE** aparecer requisições para `localhost:3000/api/auth/login`

## ✅ VERIFICAR SE FUNCIONOU:

Após testar:

1. Abra o Console (F12)
2. Vá na aba **Network**
3. Filtre por **"supabase"**
4. **NÃO deve** aparecer:
   - ❌ Requisições para `supabase.co/auth/v1/token`
   - ❌ Requisições para `supabase.co/rest/v1/`
   - ❌ WebSocket para `supabase.co/realtime/v1/websocket`
   - ❌ Requisições para `kv_store_2c4defad`
   - ❌ Mensagens "SUBSCRIBED"

5. **DEVE** aparecer:
   - ✅ Requisições para `localhost:3000/api/auth/login`
   - ✅ Requisições para `localhost:3000/api/`

## 🎯 SE FUNCIONAR LOCALMENTE:

Depois que funcionar localmente, aí sim fazer deploy no VPS:

```bash
# No VPS
cd /root/primecamp-ofc
git pull origin main
rm -rf dist node_modules/.vite .vite
npm run build
sudo rm -rf /var/www/html/assets
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
```

## ⚠️ SE NÃO FUNCIONAR LOCALMENTE:

Se ainda aparecer requisições Supabase em localhost:

1. Verifique se o build foi feito corretamente (`npm run build`)
2. Verifique se a interceptação está no código (`src/intercept-supabase.ts` e `index.html`)
3. Limpe completamente o cache do navegador
4. Teste em janela anônima

