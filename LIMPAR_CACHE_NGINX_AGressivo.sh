#!/bin/bash

set -e

echo "🧹 Limpando cache do Nginx de forma agressiva..."

# Parar Nginx temporariamente
echo "1️⃣ Parando Nginx..."
sudo systemctl stop nginx

# Limpar todos os caches possíveis
echo "2️⃣ Removendo arquivos de cache..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo rm -rf /tmp/nginx_cache/* 2>/dev/null || true

# Limpar arquivos antigos do HTML (forçar recarregamento)
echo "3️⃣ Atualizando timestamp dos arquivos..."
sudo touch /var/www/html/index.html
sudo find /var/www/html -type f -exec touch {} \;

# Reiniciar Nginx
echo "4️⃣ Reiniciando Nginx..."
sudo systemctl start nginx

# Verificar status
echo "5️⃣ Verificando status..."
sudo systemctl status nginx --no-pager -l | head -10

echo "✅ Cache do Nginx limpo com sucesso!"
echo "🔄 Tente acessar novamente a página /financeiro"
