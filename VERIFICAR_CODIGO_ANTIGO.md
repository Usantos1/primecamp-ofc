# 🔍 VERIFICAR SE HÁ CÓDIGO ANTIGO NO GIT

## ⚠️ PROBLEMA:

As mensagens "SUBSCRIBED" podem vir de:
1. Código JavaScript antigo buildado no servidor
2. Cache do navegador
3. Código antigo ainda no Git (não commitado)

## ✅ VERIFICAÇÕES:

### 1. Verificar código fonte local:

```bash
# Verificar se há código que cria channels
grep -r "\.channel(" src/ | grep -v "throwError\|Mock\|mock"

# Verificar se há código que loga SUBSCRIBED
grep -r "SUBSCRIBED" src/

# Verificar se há imports de supabase
grep -r "import.*supabase\|from.*supabase/client" src/ | grep -v "integrations/supabase/client"

# Verificar NotificationManager especificamente
cat src/components/NotificationManager.tsx | grep -i "channel\|subscribe\|subscribed"
```

### 2. Verificar Git:

```bash
# Verificar se há mudanças não commitadas
git status

# Verificar histórico do NotificationManager
git log --oneline --all -- "src/components/NotificationManager.tsx"

# Verificar se há código antigo em commits anteriores
git log --all --source --full-history -p -- "src/components/NotificationManager.tsx" | grep -i "SUBSCRIBED\|channel"
```

### 3. Verificar build no VPS:

```bash
# No VPS, verificar se build contém código Supabase
cd /root/primecamp-ofc
grep -r "SUBSCRIBED" dist/assets/*.js 2>/dev/null | head -5

# Verificar se há requisições Supabase
grep -r "supabase.co" dist/assets/*.js 2>/dev/null | head -5
```

## 🧹 LIMPAR TUDO:

### No VPS:

```bash
cd /root/primecamp-ofc

# Fazer pull
git pull origin main

# LIMPAR TUDO
rm -rf dist node_modules/.vite .vite node_modules/.cache

# Rebuildar
npm run build

# Verificar build
grep -r "SUBSCRIBED" dist/assets/*.js 2>/dev/null || echo "✅ Build limpo"

# Copiar para servidor
sudo rm -rf /var/www/html/assets
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
```

### No Navegador:

1. Limpar Service Workers (Application > Service Workers > Unregister)
2. Limpar Storage (Application > Storage > Clear site data)
3. Limpar cache (Hard refresh)
4. Testar em janela anônima

## 🎯 RESULTADO ESPERADO:

Após limpar tudo:
- ✅ **ZERO** código "SUBSCRIBED" no build
- ✅ **ZERO** requisições Supabase
- ✅ Sistema funcionando via PostgreSQL

