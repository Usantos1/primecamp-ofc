#!/bin/bash

echo "🔍 VERIFICANDO E CORRIGINDO CONFIGURAÇÃO DO NGINX"
echo "=================================================="
echo ""

echo "1️⃣ Verificando qual configuração está ativa..."
NGINX_ROOT="/var/www/primecamp.cloud"

# Encontrar arquivos de configuração
echo "   Arquivos em sites-enabled:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "^d"

echo ""
echo "2️⃣ Verificando qual servidor está ativo..."
ACTIVE_CONFIG=$(ls -t /etc/nginx/sites-enabled/*.conf 2>/dev/null | head -1)
if [ -z "$ACTIVE_CONFIG" ]; then
    echo "   ⚠️ Nenhum arquivo .conf encontrado em sites-enabled"
    ACTIVE_CONFIG=$(ls -t /etc/nginx/sites-enabled/* 2>/dev/null | head -1)
fi

if [ -n "$ACTIVE_CONFIG" ]; then
    echo "   📄 Configuração ativa: $ACTIVE_CONFIG"
    echo ""
    echo "   Verificando root directory..."
    ROOT_DIR=$(grep -E "^\s*root\s+" "$ACTIVE_CONFIG" | head -1 | awk '{print $2}' | sed 's/;$//')
    echo "   Root configurado: $ROOT_DIR"
    
    if [ "$ROOT_DIR" != "$NGINX_ROOT" ]; then
        echo "   ❌ Root incorreto! Deveria ser: $NGINX_ROOT"
        echo "   ⚠️ Isso pode ser o problema!"
    else
        echo "   ✅ Root está correto"
    fi
else
    echo "   ❌ Nenhuma configuração ativa encontrada!"
fi

echo ""
echo "3️⃣ Verificando se o diretório existe e tem arquivos..."
if [ -d "$NGINX_ROOT" ]; then
    FILE_COUNT=$(find "$NGINX_ROOT" -type f | wc -l)
    echo "   ✅ Diretório existe: $NGINX_ROOT"
    echo "   📁 Total de arquivos: $FILE_COUNT"
    
    if [ -f "$NGINX_ROOT/index.html" ]; then
        echo "   ✅ index.html existe"
        if grep -q "Formas de Pagamento" "$NGINX_ROOT/index.html" 2>/dev/null || find "$NGINX_ROOT" -name "*.js" -exec grep -l "Formas de Pagamento" {} \; 2>/dev/null | head -1 > /dev/null; then
            echo "   ✅ 'Formas de Pagamento' encontrado nos arquivos"
        else
            echo "   ⚠️ 'Formas de Pagamento' não encontrado no HTML (pode estar minificado nos JS)"
        fi
    else
        echo "   ❌ index.html NÃO existe!"
    fi
else
    echo "   ❌ Diretório $NGINX_ROOT não existe!"
fi

echo ""
echo "4️⃣ Testando sintaxe do Nginx..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Sintaxe do Nginx está OK"
else
    echo "   ❌ Erro de sintaxe no Nginx!"
    sudo nginx -t
fi

echo ""
echo "5️⃣ Verificando status do Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx está rodando"
else
    echo "   ❌ Nginx NÃO está rodando!"
fi

echo ""
echo "📋 DIAGNÓSTICO COMPLETO"
echo "   Se o root está incorreto, pode ser que o Nginx esteja servindo arquivos antigos"
echo "   Verifique o arquivo de configuração ativo e o root directory"
