#!/bin/bash

echo "🚀 DEPLOY E VERIFICAÇÃO COMPLETA"
echo "================================="
echo ""

cd /root/primecamp-ofc || { echo "Erro: Diretório não encontrado."; exit 1; }

echo "1️⃣ Limpando tudo..."
rm -rf dist
rm -rf node_modules/.vite
sudo rm -rf /var/cache/nginx/*
echo "✅ Limpeza concluída."

echo ""
echo "2️⃣ Atualizando código..."
git pull origin main
echo "✅ Código atualizado."

echo ""
echo "3️⃣ Fazendo build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi
echo "✅ Build concluído."

echo ""
echo "4️⃣ Verificando se AppSidebar.tsx foi incluído no build..."
if grep -q "APP_SIDEBAR_DEBUG" dist/assets/*.js 2>/dev/null; then
    echo "✅ Código novo encontrado no build!"
else
    echo "⚠️ Código novo NÃO encontrado no build!"
fi

echo ""
echo "5️⃣ Deployando..."
sudo rm -rf /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo systemctl reload nginx
echo "✅ Deploy concluído."

echo ""
echo "📋 TESTE AGORA:"
echo "1. Abra navegador em MODO ANÔNIMO (Ctrl+Shift+N)"
echo "2. Acesse: https://primecamp.cloud"
echo "3. Faça login"
echo "4. Abra console (F12)"
echo "5. Digite: window.APP_SIDEBAR_DEBUG"
echo "6. Veja o objeto com todas as informações"
echo ""

