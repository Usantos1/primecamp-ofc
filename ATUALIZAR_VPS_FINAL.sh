#!/bin/bash

echo "🚀 ATUALIZANDO VPS COM CÓDIGO NOVO..."
echo ""

cd /root/primecamp-ofc

echo "📦 1. Resolvendo conflito do git pull..."
# Remover arquivo que está causando conflito
rm -f server/package-lock.json

echo "📥 2. Fazendo git pull..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull falhou! Tentando reset..."
    git reset --hard origin/main
    git pull origin main
fi

echo "🧹 3. Limpando cache e builds antigos..."
rm -rf dist node_modules/.vite .vite node_modules/.cache

echo "🔨 4. Rebuildando aplicação..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build falhou!"
    exit 1
fi

echo "📤 5. Copiando arquivos para servidor web..."
sudo rm -rf /var/www/html/assets
sudo cp -r dist/* /var/www/html/

echo "🔄 6. Recarregando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ATUALIZAÇÃO CONCLUÍDA!"
echo ""
echo "⚠️ IMPORTANTE: Limpe o cache do navegador completamente:"
echo "   1. F12 → Application → Service Workers → Unregister"
echo "   2. Storage → Clear site data (marcar tudo)"
echo "   3. Ctrl+Shift+R (hard refresh)"
echo ""

