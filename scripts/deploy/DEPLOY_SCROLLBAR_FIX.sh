#!/bin/bash

# ============================================
# DEPLOY: Fix Scrollbar + Remover Warning Tailwind
# ============================================

set -e

echo "🚀 Iniciando deploy do fix scrollbar..."

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

# 2. Atualizar browserslist (opcional, mas recomendado)
echo "🔄 Atualizando browserslist..."
npx update-browserslist-db@latest || echo "⚠️ Erro ao atualizar browserslist (continuando...)"

# 3. Build frontend
echo "🔨 Fazendo build do frontend..."
npm run build

# 4. Deploy frontend
echo "📤 Fazendo deploy..."
sudo rm -rf "$NGINX_ROOT"/*
sudo cp -r dist/* "$NGINX_ROOT"/
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"

# 5. Limpar cache agressivo
echo "🧹 Limpando cache..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

echo "✅ Deploy concluído!"
echo ""
echo "💡 IMPORTANTE: Faça hard refresh no navegador:"
echo "   - Windows/Linux: Ctrl+Shift+R ou Ctrl+F5"
echo "   - Mac: Cmd+Shift+R"
echo ""
echo "📍 Teste: https://primecamp.cloud/financeiro"
