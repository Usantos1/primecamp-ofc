#!/bin/bash

# ============================================
# DEPLOY URGENTE: Fix Scrollbar
# ============================================

set -e

echo "🚀 DEPLOY URGENTE - Fix Scrollbar..."

# Detectar diretório nginx
NGINX_ROOT=$(grep -r "root " /etc/nginx/sites-enabled/*.conf 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | sed 's/;$//' | sed 's/;.*$//')
if [ -z "$NGINX_ROOT" ]; then
    if [ -d "/var/www/primecamp.cloud" ]; then
        NGINX_ROOT="/var/www/primecamp.cloud"
    elif [ -d "/var/www/html" ]; then
        NGINX_ROOT="/var/www/html"
    else
        echo "❌ Não foi possível detectar diretório Nginx"
        exit 1
    fi
fi

echo "📁 Diretório Nginx: $NGINX_ROOT"

# 1. Atualizar código
echo "📥 Atualizando código..."
cd /root/primecamp-ofc
git pull origin main

# 2. Build frontend
echo "🔨 Fazendo build do frontend..."
npm run build

# 3. Deploy frontend
echo "📤 Fazendo deploy..."
sudo rm -rf "$NGINX_ROOT"/*
sudo cp -r dist/* "$NGINX_ROOT"/
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"

# 4. Limpar cache AGressivo
echo "🧹 Limpando cache agressivo..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl stop nginx
sleep 2
sudo systemctl start nginx
sudo systemctl reload nginx

echo "✅ Deploy concluído!"
echo ""
echo "💡 IMPORTANTE: Faça hard refresh no navegador:"
echo "   - Windows/Linux: Ctrl+Shift+R ou Ctrl+F5"
echo "   - Mac: Cmd+Shift+R"
echo "   - Ou abra em aba anônima/privada"
echo ""
echo "📍 Teste: https://primecamp.cloud/financeiro/transacoes"
