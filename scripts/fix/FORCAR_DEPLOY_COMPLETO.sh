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
echo "4️⃣ Detectando diretório do Nginx..."
NGINX_ROOT=$(sudo grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-available/primecamp.cloud 2>/dev/null | grep "root" | awk '{print $2}' | sed 's/;//' || echo "")
if [ -z "$NGINX_ROOT" ]; then
  NGINX_ROOT=$(sudo grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-enabled/primecamp.cloud* 2>/dev/null | grep "root" | head -1 | awk '{print $2}' | sed 's/;//' || echo "")
fi
if [ -z "$NGINX_ROOT" ]; then
  echo "  ⚠️  Não foi possível detectar, usando padrão: /var/www/primecamp.cloud"
  NGINX_ROOT="/var/www/primecamp.cloud"
fi
echo "  📁 Diretório do Nginx: $NGINX_ROOT"

if [ ! -d "$NGINX_ROOT" ]; then
  echo "  📁 Criando diretório $NGINX_ROOT..."
  sudo mkdir -p "$NGINX_ROOT"
fi

echo ""
echo "5️⃣ Limpando diretório do Nginx..."
sudo rm -rf "$NGINX_ROOT"/*
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*

echo ""
echo "6️⃣ Copiando novos arquivos..."
sudo cp -r dist/* "$NGINX_ROOT/"
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"

echo ""
echo "7️⃣ Verificando se FinanceiroNavMenu foi deployado..."
if grep -q "FinanceiroNavMenu" "$NGINX_ROOT"/assets/*.js 2>/dev/null; then
  echo "  ✅ FinanceiroNavMenu encontrado no bundle deployado"
else
  echo "  ❌ FinanceiroNavMenu NÃO encontrado - algo deu errado no build"
  exit 1
fi

echo ""
echo "8️⃣ Recarregando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Deploy completo concluído!"
echo "🌐 Acesse: https://primecamp.cloud/financeiro"
echo "💡 No navegador: Ctrl+Shift+R (hard refresh)"
