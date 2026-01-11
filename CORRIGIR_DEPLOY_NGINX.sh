#!/bin/bash
set -e

echo "🔧 CORRIGINDO DEPLOY DO NGINX"
echo "=============================="
echo ""

cd /root/primecamp-ofc

# Verificar qual é o diretório correto
echo "1️⃣ Verificando configuração do Nginx para primecamp.cloud..."
NGINX_ROOT=$(sudo grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-available/primecamp.cloud 2>/dev/null | grep "root" | awk '{print $2}' | sed 's/;//' || echo "")

if [ -z "$NGINX_ROOT" ]; then
    # Tentar pegar do sites-enabled
    NGINX_ROOT=$(sudo grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-enabled/primecamp.cloud* 2>/dev/null | grep "root" | head -1 | awk '{print $2}' | sed 's/;//' || echo "")
fi

if [ -n "$NGINX_ROOT" ]; then
    echo "  ✅ Diretório root encontrado: $NGINX_ROOT"
else
    echo "  ⚠️  Não foi possível detectar automaticamente, usando padrão: /var/www/primecamp.cloud"
    NGINX_ROOT="/var/www/primecamp.cloud"
fi

# Verificar se o diretório existe
if [ ! -d "$NGINX_ROOT" ]; then
    echo ""
    echo "  📁 Criando diretório $NGINX_ROOT..."
    sudo mkdir -p "$NGINX_ROOT"
    sudo chown -R www-data:www-data "$NGINX_ROOT"
    echo "  ✅ Diretório criado"
fi

# Verificar se há build
if [ ! -d "dist" ]; then
    echo ""
    echo "  ⚠️  Diretório 'dist' não encontrado. Fazendo build..."
    npm run build
fi

# Fazer deploy para o diretório correto
echo ""
echo "2️⃣ Fazendo deploy para $NGINX_ROOT..."
sudo rm -rf "$NGINX_ROOT"/*
sudo cp -r dist/* "$NGINX_ROOT/"
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"

echo "  ✅ Deploy concluído"

# Limpar cache
echo ""
echo "3️⃣ Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

echo ""
echo "✅ Correção concluída!"
echo ""
echo "📝 Diretório correto: $NGINX_ROOT"
echo "🌐 Acesse: https://primecamp.cloud/financeiro"
