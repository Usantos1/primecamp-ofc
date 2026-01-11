#!/bin/bash
set -e

echo "🚀 Forçando deploy completo (limpar tudo e rebuild)..."
echo ""

cd /root/primecamp-ofc

echo "1️⃣ Atualizando código..."
git pull origin main

echo ""
echo "2️⃣ Limpando builds anteriores..."
rm -rf dist
rm -rf node_modules/.vite

echo ""
echo "3️⃣ Fazendo build limpo..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Erro: Build falhou - diretório dist não criado"
  exit 1
fi

echo ""
echo "4️⃣ Limpando diretório do Nginx..."
sudo rm -rf /var/www/html/*
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*

echo ""
echo "5️⃣ Copiando novos arquivos..."
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

echo ""
echo "6️⃣ Verificando se FinanceiroNavMenu foi deployado..."
if grep -q "FinanceiroNavMenu" /var/www/html/assets/*.js 2>/dev/null; then
  echo "  ✅ FinanceiroNavMenu encontrado no bundle deployado"
else
  echo "  ❌ FinanceiroNavMenu NÃO encontrado - algo deu errado no build"
  exit 1
fi

echo ""
echo "7️⃣ Recarregando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Deploy completo concluído!"
echo "🌐 Acesse: https://primecamp.cloud/financeiro"
echo "💡 No navegador: Ctrl+Shift+R (hard refresh)"
