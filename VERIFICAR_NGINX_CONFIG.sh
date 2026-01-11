#!/bin/bash

echo "🔍 VERIFICANDO CONFIGURAÇÃO DO NGINX"
echo "====================================="
echo ""

# Verificar qual é o root configurado no Nginx
echo "1️⃣ Verificando configuração do Nginx..."
if [ -f "/etc/nginx/sites-available/default" ]; then
    echo "  📄 Arquivo: /etc/nginx/sites-available/default"
    echo ""
    echo "  📍 Diretório root configurado:"
    sudo grep -n "root" /etc/nginx/sites-available/default | grep -v "#" | head -5
    echo ""
    echo "  📍 Configuração completa do server block:"
    sudo grep -A 20 "server {" /etc/nginx/sites-available/default | head -25
elif [ -f "/etc/nginx/nginx.conf" ]; then
    echo "  📄 Verificando nginx.conf..."
    sudo grep -n "root" /etc/nginx/nginx.conf | grep -v "#" | head -5
else
    echo "  ❌ Arquivo de configuração não encontrado"
fi

echo ""
echo "2️⃣ Verificando arquivos em /var/www/html..."
if [ -d "/var/www/html" ]; then
    echo "  ✅ Diretório existe"
    echo "  📁 Arquivos:"
    ls -lah /var/www/html/ | head -10
    echo ""
    if [ -f "/var/www/html/index.html" ]; then
        echo "  ✅ index.html existe"
    else
        echo "  ❌ index.html NÃO existe!"
    fi
else
    echo "  ❌ Diretório /var/www/html não existe!"
fi

echo ""
echo "3️⃣ Testando acesso via localhost..."
echo "  Testando: curl -s -o /dev/null -w '%{http_code}' http://localhost/"
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/ 2>/dev/null || echo "000")
echo "  Código HTTP: $HTTP_CODE"

echo ""
echo "4️⃣ Verificando processos do Nginx..."
sudo systemctl status nginx --no-pager | head -15

echo ""
echo "✅ Verificação concluída!"
