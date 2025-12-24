# ✅ COMANDOS FINAIS PARA VPS

## 🔧 CORREÇÕES APLICADAS:

1. ✅ `useTasks.ts` - Migrado completamente
2. ✅ `useUserLogs.ts` - Migrado completamente

## 🚀 EXECUTE NO VPS:

```bash
cd /root/primecamp-ofc

# 1. Fazer backup do .env
cp .env .env.backup

# 2. Fazer stash das mudanças locais
git stash

# 3. Fazer pull do código corrigido
git pull origin main

# 4. Verificar .env
cat .env | grep VITE_DB_MODE
# Deve mostrar: VITE_DB_MODE=postgres

# 5. Rebuildar
rm -rf dist node_modules/.vite .vite
npm run build

# 6. Se o build funcionar, copiar para servidor
sudo cp -r dist/* /var/www/html/

# 7. Recarregar nginx
sudo systemctl reload nginx

# 8. Verificar se funcionou
ls -la /var/www/html/index.html
echo "✅ Deploy concluído!"
```

## 🧹 LIMPAR CACHE DO NAVEGADOR:

Após o deploy:
1. Abra DevTools (F12)
2. Clique com botão direito no refresh
3. Selecione **"Empty Cache and Hard Reload"**

Ou no Console:
```javascript
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    localStorage.removeItem(key);
  }
});
location.reload();
```

## ✅ RESULTADO ESPERADO:

- ✅ Build deve completar sem erros
- ✅ Arquivo `dist/index.html` será criado
- ✅ Deploy funcionará corretamente
- ✅ **ZERO** requisições para Supabase

