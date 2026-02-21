#!/bin/bash

echo "🔥 DEPLOY FORÇANDO REBUILD COMPLETO SEM CACHE"
echo "=============================================="
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Atualizando código do repositório..."
git pull origin main
echo "   ✅ Código atualizado"
echo ""

echo "2️⃣ Limpando TODOS os caches do Vite e Node..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf dist
rm -rf .cache
echo "   ✅ Caches do Vite limpos"
echo ""

echo "3️⃣ Limpando dist antigo..."
rm -rf dist/*
echo "   ✅ Dist limpo"
echo ""

echo "4️⃣ Executando build completo (SEM cache)..."
NODE_ENV=production npm run build
if [ $? -ne 0 ]; then
    echo "   ❌ Erro no build!"
    exit 1
fi
echo "   ✅ Build concluído"
echo ""

echo "5️⃣ Copiando arquivos para o servidor web..."
sudo rm -rf /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
echo "   ✅ Arquivos copiados"
echo ""

echo "6️⃣ Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo rm -rf /tmp/nginx_cache/*
echo "   ✅ Cache do Nginx limpo"
echo ""

echo "7️⃣ Recarregando Nginx..."
sudo systemctl reload nginx
if [ $? -ne 0 ]; then
    echo "   ⚠️ Erro ao recarregar Nginx, tentando restart..."
    sudo systemctl restart nginx
fi
echo "   ✅ Nginx recarregado"
echo ""

echo "✅ DEPLOY COMPLETO!"
echo ""
echo "📋 Próximos passos:"
echo "   - Teste em uma janela anônima do navegador"
echo "   - Ou limpe o cache do navegador (Ctrl+Shift+Delete)"
echo "   - Acesse: https://primecamp.cloud/admin/configuracoes"
echo ""
