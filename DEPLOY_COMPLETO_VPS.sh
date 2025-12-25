#!/bin/bash

echo "🚀 DEPLOY COMPLETO NA VPS - Frontend + Backend"
echo "================================================"

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

echo ""
echo "1. Atualizando código..."
git pull origin main || { echo "❌ Erro: git pull falhou"; exit 1; }

echo ""
echo "2. Limpando builds antigos..."
rm -rf dist node_modules/.vite .vite node_modules/.cache .next build
echo "✅ Limpeza concluída"

echo ""
echo "3. Rebuildando frontend..."
npm run build || { echo "❌ ERRO: Build frontend falhou!"; exit 1; }
echo "✅ Build frontend concluído"

echo ""
echo "4. Verificando se dist/index.html foi criado..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ ERRO: dist/index.html não foi criado!"
    exit 1
fi
echo "✅ dist/index.html existe"

echo ""
echo "5. Copiando frontend para servidor web..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
echo "✅ Frontend copiado"

echo ""
echo "6. Atualizando backend (API)..."
cd server || { echo "❌ Erro: Não foi possível entrar no diretório server"; exit 1; }

# Verificar se há mudanças no código
if git diff HEAD~1 --name-only | grep -q "server/index.js"; then
    echo "   Código da API foi alterado, reiniciando..."
    pm2 restart primecamp-api || { echo "⚠️  AVISO: PM2 restart falhou, tentando start..."; pm2 start index.js --name primecamp-api; }
    echo "✅ API reiniciada"
else
    echo "   Nenhuma mudança na API, pulando reinicialização"
fi

cd ..

echo ""
echo "7. Recarregando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recarregado"

echo ""
echo "8. Verificando status..."
echo ""
echo "📊 Status do PM2:"
pm2 status

echo ""
echo "📊 Status do Nginx:"
sudo systemctl status nginx --no-pager -l | head -5

echo ""
echo "🎉 DEPLOY COMPLETO CONCLUÍDO!"
echo ""
echo "📋 TESTAR AGORA:"
echo "1. Acesse: https://primecamp.cloud/test-auth"
echo "2. Abra o Console (F12)"
echo "3. Clique em 'Testar Conexão com API'"
echo "4. Deve aparecer: '✅ API está funcionando!'"
echo ""
echo "Se ainda aparecer cache antigo:"
echo "- Abra em janela anônima (Ctrl + Shift + N)"
echo "- Ou limpe cache: Ctrl + Shift + Delete"

