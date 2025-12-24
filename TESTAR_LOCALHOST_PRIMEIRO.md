# 🧪 TESTAR EM LOCALHOST PRIMEIRO

## ✅ VANTAGENS DE TESTAR LOCALMENTE:

1. **Mais rápido** - Não precisa fazer deploy no VPS
2. **Mais fácil debugar** - Console e DevTools mais acessíveis
3. **Menos cache** - Navegador não tem cache de produção
4. **Teste rápido** - Rebuild instantâneo

## 🚀 PASSOS PARA TESTAR LOCALMENTE:

### 1. Garantir que API está rodando:

```bash
# No terminal, verificar se API está rodando
cd server
npm start

# Deve aparecer: "API rodando na porta 3000"
```

### 2. Garantir que .env está correto:

No arquivo `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:3000/api
VITE_DB_MODE=postgres
```

### 3. Limpar build anterior:

```bash
# Na raiz do projeto
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
```

### 4. Rebuildar:

```bash
npm run build
```

### 5. Verificar build:

```bash
# Verificar se NÃO tem código Supabase
grep -r "supabase.co/auth/v1/token" dist/assets/*.js 2>/dev/null && echo "❌ ERRO: Build tem Supabase!" || echo "✅ Build limpo"
grep -r "realtime/v1/websocket" dist/assets/*.js 2>/dev/null && echo "❌ ERRO: Build tem WebSocket Supabase!" || echo "✅ Build limpo"
```

### 6. Rodar servidor de desenvolvimento:

```bash
npm run dev
```

### 7. Abrir no navegador:

1. Abra `http://localhost:5173` (ou a porta que o Vite mostrar)
2. Abra DevTools (F12)
3. Vá na aba **Network**
4. Filtre por **"supabase"**
5. **NÃO deve** aparecer NENHUMA requisição

### 8. Limpar cache do navegador:

No Console (F12), execute:

```javascript
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name)));
if ('caches' in window) caches.keys().then(names => names.forEach(name => caches.delete(name)));
console.log('✅ Cache limpo!');
```

### 9. Hard refresh:

- **Chrome/Edge:** `Ctrl + Shift + R`
- **Firefox:** `Ctrl + Shift + R`

### 10. Testar login:

1. Tente fazer login
2. Verifique o Network tab
3. **NÃO deve** aparecer requisições para `supabase.co`
4. **DEVE** aparecer requisições para `localhost:3000/api/auth/login`

## ✅ VERIFICAR SE FUNCIONOU:

Após testar localmente:

1. Abra o Console (F12)
2. Vá na aba **Network**
3. Filtre por **"supabase"**
4. **NÃO deve** aparecer:
   - ❌ Requisições para `supabase.co/auth/v1/token`
   - ❌ Requisições para `supabase.co/rest/v1/`
   - ❌ WebSocket para `supabase.co/realtime/v1/websocket`
   - ❌ Requisições para `kv_store_2c4defad`

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

1. Verifique se o build foi feito corretamente
2. Verifique se a interceptação está no código (`src/intercept-supabase.ts` e `index.html`)
3. Verifique se não há código que ainda usa Supabase diretamente
4. Limpe completamente o cache do navegador
5. Teste em janela anônima

