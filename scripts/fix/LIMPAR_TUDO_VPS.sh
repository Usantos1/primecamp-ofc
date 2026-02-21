#!/bin/bash

echo "🚨 LIMPEZA TOTAL DO VPS - REMOVER SUPABASE COMPLETAMENTE"
echo ""

cd /root/primecamp-ofc

echo "1️⃣ Removendo arquivos que causam conflito..."
rm -f server/package-lock.json

echo "2️⃣ Fazendo git reset hard e pull..."
git fetch origin
git reset --hard origin/main
git clean -fd
git pull origin main

echo "3️⃣ Verificando código fonte..."
if grep -r "supabase\.auth\.signIn\|supabase\.auth\.getUser\|supabase\.channel\|\.subscribe(" src/ 2>/dev/null | grep -v "throwError\|Mock\|mock\|//" | head -5; then
    echo "⚠️ AVISO: Código fonte ainda contém chamadas diretas ao Supabase!"
fi

echo "4️⃣ Limpando TUDO..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
rm -rf node_modules/.cache
rm -rf .next
rm -rf build

echo "5️⃣ Rebuildando aplicação..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ BUILD FALHOU!"
    exit 1
fi

echo "6️⃣ Verificando build..."
echo "   Verificando se há código Supabase no build..."

if grep -r "supabase\.co/auth/v1/token" dist/assets/*.js 2>/dev/null | head -1; then
    echo "❌ ERRO: Build ainda contém requisições Supabase Auth!"
    echo "   Arquivos problemáticos:"
    grep -r "supabase\.co/auth/v1/token" dist/assets/*.js 2>/dev/null | head -3
    exit 1
fi

if grep -r "\.channel\|\.subscribe\|SUBSCRIBED" dist/assets/*.js 2>/dev/null | grep -v "throwError\|Mock" | head -1; then
    echo "⚠️ AVISO: Build pode conter código de channels/subscriptions"
    echo "   Verificando..."
    grep -r "\.channel\|\.subscribe\|SUBSCRIBED" dist/assets/*.js 2>/dev/null | grep -v "throwError\|Mock" | head -3
fi

echo "✅ Build verificado"

echo "7️⃣ Removendo assets antigos do servidor..."
sudo rm -rf /var/www/html/assets
sudo rm -rf /var/www/html/*.js
sudo rm -rf /var/www/html/*.css
sudo rm -rf /var/www/html/*.html

echo "8️⃣ Copiando novos arquivos..."
sudo cp -r dist/* /var/www/html/

echo "9️⃣ Ajustando permissões..."
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

echo "🔟 Recarregando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ LIMPEZA COMPLETA CONCLUÍDA!"
echo ""
echo "⚠️⚠️⚠️ IMPORTANTE - LIMPE O CACHE DO NAVEGADOR:"
echo "   1. F12 → Application → Service Workers → Unregister ALL"
echo "   2. Application → Storage → Clear site data (marcar TUDO)"
echo "   3. Application → IndexedDB → Delete tudo"
echo "   4. Application → Local Storage → Clear all"
echo "   5. Application → Session Storage → Clear all"
echo "   6. Network → Disable cache (marcar)"
echo "   7. Ctrl+Shift+Delete → Limpar dados de navegação (última hora)"
echo "   8. Fechar TODAS as abas do site"
echo "   9. Abrir em janela anônima/privada"
echo "   10. Ctrl+Shift+R (hard refresh)"
echo ""
echo "📋 Verificar no console:"
echo "   - NÃO deve aparecer: 'supabase.co/auth/v1/token'"
echo "   - NÃO deve aparecer: 'SUBSCRIBED'"
echo "   - NÃO deve aparecer: 'supabase.co/rest/v1'"
echo ""

