#!/bin/bash

echo "🚨 REBUILD TOTAL - REMOVER SUPABASE COMPLETAMENTE"
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
echo "   Verificando se há código Supabase no fonte..."
if grep -r "supabase\.auth\.signIn\|supabase\.channel\|\.subscribe(" src/ 2>/dev/null | grep -v "throwError\|Mock\|mock\|//" | head -3; then
    echo "⚠️ AVISO: Código fonte ainda contém chamadas diretas ao Supabase!"
fi

echo "4️⃣ Limpando TUDO (incluindo node_modules se necessário)..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
rm -rf node_modules/.cache
rm -rf .next
rm -rf build
rm -rf .turbo

echo "5️⃣ Verificando package.json para dependências Supabase..."
if grep -i "supabase" package.json 2>/dev/null; then
    echo "⚠️ AVISO: package.json contém referências ao Supabase!"
    echo "   Verificando se é apenas comentário..."
fi

echo "6️⃣ Rebuildando aplicação..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ BUILD FALHOU!"
    exit 1
fi

echo "7️⃣ Verificando build..."
echo "   Verificando se há código Supabase no build..."

# Verificar se há requisições Supabase Auth
if grep -r "supabase\.co/auth/v1/token\|auth/v1/token\|grant_type=password" dist/assets/*.js 2>/dev/null | head -1; then
    echo "❌ ERRO CRÍTICO: Build ainda contém requisições Supabase Auth!"
    echo "   Arquivos problemáticos:"
    grep -r "supabase\.co/auth/v1/token\|auth/v1/token\|grant_type=password" dist/assets/*.js 2>/dev/null | head -3
    echo ""
    echo "   Tentando encontrar origem..."
    grep -r "signInWithPassword\|grant_type" dist/assets/*.js 2>/dev/null | head -3
    exit 1
fi

# Verificar se há URLs Supabase
if grep -r "supabase\.co" dist/assets/*.js 2>/dev/null | grep -v "throwError\|Mock\|blocked\|BLOQUEADA" | head -1; then
    echo "⚠️ AVISO: Build contém URLs Supabase (pode ser código de bloqueio)"
    echo "   Verificando contexto..."
    grep -r "supabase\.co" dist/assets/*.js 2>/dev/null | grep -v "throwError\|Mock\|blocked\|BLOQUEADA" | head -3
fi

# Verificar se há channels/subscriptions
if grep -r "\.channel\|\.subscribe\|SUBSCRIBED" dist/assets/*.js 2>/dev/null | grep -v "throwError\|Mock\|blocked\|BLOQUEADA\|desabilitado" | head -1; then
    echo "⚠️ AVISO: Build pode conter código de channels/subscriptions"
    echo "   Verificando contexto..."
    grep -r "\.channel\|\.subscribe\|SUBSCRIBED" dist/assets/*.js 2>/dev/null | grep -v "throwError\|Mock\|blocked\|BLOQUEADA\|desabilitado" | head -3
fi

echo "✅ Build verificado"

echo "8️⃣ Removendo assets antigos do servidor..."
sudo rm -rf /var/www/html/assets
sudo rm -rf /var/www/html/*.js
sudo rm -rf /var/www/html/*.css
sudo rm -rf /var/www/html/*.html
sudo rm -rf /var/www/html/*.map

echo "9️⃣ Copiando novos arquivos..."
sudo cp -r dist/* /var/www/html/

echo "🔟 Ajustando permissões..."
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

echo "1️⃣1️⃣ Recarregando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ REBUILD COMPLETO CONCLUÍDO!"
echo ""
echo "📋 VERIFICAÇÕES NO NAVEGADOR:"
echo "   1. Limpar cache completamente (Ctrl+Shift+Delete)"
echo "   2. Application → Service Workers → Unregister ALL"
echo "   3. Application → Storage → Clear site data (TUDO)"
echo "   4. Fechar TODAS as abas"
echo "   5. Abrir em janela anônima"
echo "   6. Ctrl+Shift+R (hard refresh)"
echo ""
echo "📋 Verificar no console:"
echo "   ✅ Deve aparecer: '🚫 Interceptação Supabase COMPLETA ATIVADA'"
echo "   ❌ NÃO deve aparecer: 'supabase.co/auth/v1/token'"
echo "   ❌ NÃO deve aparecer: 'SUBSCRIBED' (sem contexto de bloqueio)"
echo "   ❌ NÃO deve aparecer: 'supabase.co/rest/v1'"
echo ""

