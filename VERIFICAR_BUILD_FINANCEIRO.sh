#!/bin/bash

echo "🔍 Verificando se as rotas financeiro estão no código fonte..."
cd /root/primecamp-ofc

# Verificar se as rotas estão no App.tsx
if grep -q "Sistema IA-First Financeiro" src/App.tsx; then
    echo "✅ Rotas financeiro encontradas no código fonte (App.tsx)"
    grep -A 12 "Sistema IA-First Financeiro" src/App.tsx | head -15
else
    echo "❌ ERRO: Rotas financeiro NÃO encontradas no código fonte!"
    exit 1
fi

echo ""
echo "🔨 Fazendo build limpo..."
rm -rf dist node_modules/.vite
npm run build

echo ""
echo "🔍 Verificando se as rotas estão no bundle..."
if grep -q "financeiro" dist/assets/*.js 2>/dev/null; then
    echo "✅ Rotas financeiro encontradas no bundle!"
    grep -r "financeiro" dist/assets/*.js | head -5
else
    echo "❌ ERRO: Rotas financeiro NÃO encontradas no bundle!"
    echo "Isso indica um problema no build ou no código."
    exit 1
fi

echo ""
echo "📦 Copiando arquivos..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

echo ""
echo "✅ Verificação e deploy concluídos!"
