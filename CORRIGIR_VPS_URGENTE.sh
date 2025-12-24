#!/bin/bash

echo "🚨 CORREÇÃO URGENTE - VPS"
echo ""

cd /root/primecamp-ofc

echo "1️⃣ Removendo arquivo que causa conflito..."
rm -f server/package-lock.json

echo "2️⃣ Fazendo git reset e pull..."
git reset --hard origin/main
git pull origin main

echo "3️⃣ Limpando TUDO..."
rm -rf dist node_modules/.vite .vite node_modules/.cache

echo "4️⃣ Rebuildando..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ BUILD FALHOU!"
    exit 1
fi

echo "5️⃣ Verificando se build está limpo..."
if grep -r "supabase.co/auth/v1/token" dist/assets/*.js 2>/dev/null | head -1; then
    echo "⚠️ AVISO: Build ainda contém código Supabase Auth!"
else
    echo "✅ Build limpo - sem Supabase Auth"
fi

echo "6️⃣ Copiando para servidor..."
sudo rm -rf /var/www/html/assets
sudo cp -r dist/* /var/www/html/

echo "7️⃣ Recarregando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ CONCLUÍDO!"
echo ""
echo "⚠️ LIMPE O CACHE DO NAVEGADOR AGORA:"
echo "   F12 → Application → Clear storage → Clear site data"
echo "   Depois: Ctrl+Shift+R (hard refresh)"

