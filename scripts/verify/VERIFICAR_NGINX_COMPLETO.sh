#!/bin/bash

echo "🔍 VERIFICANDO CONFIGURAÇÃO COMPLETA DO NGINX"
echo "=============================================="
echo ""

echo "1️⃣ Configuração completa do server block:"
echo "------------------------------------------"
sudo cat /etc/nginx/sites-available/default | grep -A 100 "server {" | head -80

echo ""
echo "2️⃣ Testando acesso direto ao arquivo:"
echo "--------------------------------------"
if [ -f "/var/www/html/index.html" ]; then
    echo "✅ Arquivo existe: /var/www/html/index.html"
    echo "📄 Primeiras linhas do arquivo:"
    head -5 /var/www/html/index.html
else
    echo "❌ Arquivo NÃO existe!"
fi

echo ""
echo "3️⃣ Testando com curl detalhado:"
echo "--------------------------------"
curl -v http://localhost/ 2>&1 | head -30

echo ""
echo "4️⃣ Verificando se há outros arquivos de configuração ativos:"
echo "-------------------------------------------------------------"
if [ -d "/etc/nginx/sites-enabled" ]; then
    echo "📁 Arquivos em sites-enabled:"
    ls -la /etc/nginx/sites-enabled/
    
    for file in /etc/nginx/sites-enabled/*; do
        if [ -f "$file" ]; then
            echo ""
            echo "📄 Conteúdo de $(basename $file):"
            cat "$file" | grep -A 50 "server {" | head -60
        fi
    done
fi

echo ""
echo "5️⃣ Testando configuração do Nginx:"
echo "-----------------------------------"
sudo nginx -t
