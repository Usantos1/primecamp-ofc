#!/bin/bash

echo "🔍 VERIFICANDO CONFIGURAÇÃO DO NGINX"
echo "====================================="
echo ""

echo "1️⃣ Verificando arquivos de configuração..."
NGINX_SITES="/etc/nginx/sites-enabled"
echo "   Arquivos em sites-enabled:"
ls -la "$NGINX_SITES" | grep primecamp

echo ""
echo "2️⃣ Verificando configuração do primecamp.cloud..."
NGINX_CONFIG="/etc/nginx/sites-available/primecamp.cloud"
if [ -f "$NGINX_CONFIG" ]; then
    echo "   ✅ Arquivo encontrado: $NGINX_CONFIG"
    echo ""
    echo "   Conteúdo da configuração:"
    cat "$NGINX_CONFIG"
else
    echo "   ❌ Arquivo não encontrado!"
    echo "   Procurando em sites-enabled..."
    NGINX_CONFIG_ENABLED="/etc/nginx/sites-enabled/primecamp.cloud"
    if [ -f "$NGINX_CONFIG_ENABLED" ]; then
        echo "   ✅ Encontrado em sites-enabled"
        echo ""
        echo "   Conteúdo da configuração:"
        cat "$NGINX_CONFIG_ENABLED"
    else
        echo "   ❌ Não encontrado em sites-enabled também!"
        echo "   Listando todos os arquivos de configuração:"
        ls -la /etc/nginx/sites-available/ | grep primecamp
        ls -la /etc/nginx/sites-enabled/ | grep primecamp
    fi
fi

echo ""
echo "3️⃣ Verificando se há location /assets configurado..."
if [ -f "$NGINX_CONFIG" ]; then
    if grep -q "location /assets" "$NGINX_CONFIG"; then
        echo "   ✅ Location /assets encontrado"
        echo "   Configuração:"
        grep -A 10 "location /assets" "$NGINX_CONFIG"
    else
        echo "   ⚠️ Location /assets NÃO encontrado"
        echo "   Verificando location /..."
        grep -A 15 "location /" "$NGINX_CONFIG" | head -20
    fi
fi

echo ""
echo "4️⃣ Verificando root do servidor..."
if [ -f "$NGINX_CONFIG" ]; then
    echo "   Root configurado:"
    grep "root " "$NGINX_CONFIG" | head -3
fi

echo ""
echo "5️⃣ Testando acesso HTTPS direto..."
curl -I https://primecamp.cloud/assets/index-B2StyxFt.js 2>&1 | head -10

echo ""
echo "✅ Verificação concluída!"
