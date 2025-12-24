# 🚨 COMANDOS URGENTES PARA VPS

## ⚠️ PROBLEMA:

O `git pull` falhou porque há mudanças locais no `.env`. O código migrado **NÃO foi aplicado**!

## ✅ EXECUTE ESTES COMANDOS NO VPS:

```bash
cd /root/primecamp-ofc

# 1. Fazer backup do .env
cp .env .env.backup

# 2. Fazer stash das mudanças locais (salva temporariamente)
git stash

# 3. AGORA fazer pull do código migrado
git pull origin main

# 4. Verificar se o .env precisa ser ajustado
cat .env | grep VITE_DB_MODE
cat .env | grep VITE_API_URL

# Se VITE_DB_MODE não for "postgres", ajuste:
# nano .env
# (Garanta que tenha: VITE_DB_MODE=postgres)

# 5. Rebuildar com o código migrado
rm -rf dist node_modules/.vite .vite
npm run build

# 6. Copiar para o servidor web
sudo cp -r dist/* /var/www/html/

# 7. Recarregar nginx
sudo systemctl reload nginx

# 8. Verificar se funcionou
echo "✅ Deploy concluído! Teste no navegador."
```

## 🧹 DEPOIS, NO NAVEGADOR:

1. Abra DevTools (F12)
2. Clique com botão direito no refresh
3. Selecione **"Empty Cache and Hard Reload"**

Ou execute no Console:
```javascript
// Limpar tudo do Supabase
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    localStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    sessionStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

location.reload();
```

## ✅ RESULTADO ESPERADO:

Após executar os comandos:
- ✅ Código migrado aplicado
- ✅ Build feito com código novo
- ✅ **ZERO** requisições para Supabase
- ✅ Tudo funcionando via PostgreSQL

