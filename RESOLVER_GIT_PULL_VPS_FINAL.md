# 🔧 RESOLVER GIT PULL NO VPS - URGENTE

## ❌ PROBLEMA:

O `git pull` falhou porque há mudanças locais no `.env`. Isso significa que o código migrado **NÃO foi aplicado** no servidor!

## ✅ SOLUÇÃO:

Execute no VPS:

```bash
cd /root/primecamp-ofc

# 1. Fazer backup do .env atual
cp .env .env.backup

# 2. Fazer stash das mudanças locais
git stash

# 3. Fazer pull do código migrado
git pull origin main

# 4. Restaurar o .env (se necessário)
# Se o .env foi modificado, você pode precisar ajustar manualmente
# Ou restaurar do backup:
# cp .env.backup .env

# 5. Rebuildar com o código migrado
rm -rf dist node_modules/.vite .vite
npm run build

# 6. Copiar para o servidor web
sudo cp -r dist/* /var/www/html/

# 7. Recarregar nginx
sudo systemctl reload nginx
```

## ⚠️ IMPORTANTE:

Se o `.env` foi modificado localmente no VPS, você precisará:
1. Verificar quais variáveis foram alteradas
2. Garantir que `VITE_DB_MODE=postgres` e `VITE_API_URL` estão corretos
3. Ajustar manualmente se necessário

## 🧹 LIMPAR CACHE DO NAVEGADOR:

Após o deploy, limpe o cache:
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

