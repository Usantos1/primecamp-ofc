#!/bin/bash

# 🧹 SCRIPT PARA LIMPAR VPS COMPLETAMENTE E REBUILDAR

echo "🧹 Limpando VPS completamente..."

cd /root/primecamp-ofc

# 1. Fazer pull do código atualizado
echo "📥 Fazendo pull do código..."
git pull origin main

# 2. LIMPAR TUDO
echo "🗑️ Limpando arquivos antigos..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
rm -rf node_modules/.cache
rm -rf .next
rm -rf build

# 3. Verificar se há código Supabase no código fonte
echo "🔍 Verificando código fonte..."
if grep -r "SUBSCRIBED" src/ 2>/dev/null; then
    echo "⚠️ ATENÇÃO: Código fonte ainda contém 'SUBSCRIBED'!"
    exit 1
fi

if grep -r "supabase.channel" src/ 2>/dev/null; then
    echo "⚠️ ATENÇÃO: Código fonte ainda contém 'supabase.channel'!"
    exit 1
fi

# 4. Rebuildar
echo "🔨 Rebuildando..."
npm run build

# 5. Verificar se build está limpo
echo "✅ Verificando build..."
if grep -r "SUBSCRIBED" dist/assets/*.js 2>/dev/null; then
    echo "❌ ERRO: Build ainda contém código Supabase!"
    echo "Verificando quais arquivos..."
    grep -r "SUBSCRIBED" dist/assets/*.js 2>/dev/null | head -5
    exit 1
fi

if grep -r "supabase.co/auth/v1/token" dist/assets/*.js 2>/dev/null; then
    echo "❌ ERRO: Build ainda contém requisições Supabase Auth!"
    exit 1
fi

echo "✅ Build limpo - sem código Supabase!"

# 6. REMOVER assets antigos e copiar novos
echo "📦 Copiando arquivos para servidor..."
sudo rm -rf /var/www/html/assets
sudo cp -r dist/* /var/www/html/

# 7. Verificar timestamp
echo "📅 Verificando timestamp dos arquivos..."
ls -la /var/www/html/assets/*.js | head -3

# 8. Recarregar nginx
echo "🔄 Recarregando nginx..."
sudo systemctl reload nginx

echo "✅ VPS limpo e rebuildado com sucesso!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Limpe o cache do navegador completamente"
echo "2. Teste em janela anônima"
echo "3. Verifique o console - não deve aparecer requisições Supabase"

