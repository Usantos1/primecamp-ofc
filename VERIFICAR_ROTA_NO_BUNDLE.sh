#!/bin/bash

echo "🔍 VERIFICAR SE ROTA ESTÁ NO BUNDLE BUILDADO"
echo "============================================="
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

# Verificar se dist existe
if [ ! -d "dist" ]; then
    echo "❌ ERRO: dist/ não existe! Execute 'npm run build' primeiro."
    exit 1
fi

# Procurar rota no bundle
echo "1. Procurando 'test-auth' nos arquivos JavaScript buildados..."
BUNDLE_FILE=$(find dist/assets -name "*.js" -type f | head -1)

if [ -z "$BUNDLE_FILE" ]; then
    echo "❌ ERRO: Nenhum arquivo JavaScript encontrado em dist/assets/"
    exit 1
fi

echo "✅ Arquivo encontrado: $BUNDLE_FILE"
echo ""

# Verificar se test-auth está no bundle
if grep -q "test-auth" "$BUNDLE_FILE"; then
    echo "✅ 'test-auth' ENCONTRADO no bundle!"
    echo ""
    echo "Linhas encontradas:"
    grep -n "test-auth" "$BUNDLE_FILE" | head -5
else
    echo "❌ ERRO: 'test-auth' NÃO encontrado no bundle!"
    echo ""
    echo "O código buildado não contém a rota."
    echo "Isso significa que o build está desatualizado ou a rota não está no código fonte."
    echo ""
    echo "Verificando código fonte..."
    if grep -q 'path="/test-auth"' src/App.tsx; then
        echo "✅ Rota está no código fonte (src/App.tsx)"
        echo "❌ Mas NÃO está no bundle buildado!"
        echo ""
        echo "SOLUÇÃO: Rebuildar o frontend"
        exit 1
    else
        echo "❌ Rota NÃO está no código fonte!"
        exit 1
    fi
fi

echo ""
echo "2. Verificando se está no servidor web..."
if [ -f "/var/www/html/index.html" ]; then
    echo "✅ /var/www/html/index.html existe"
    
    # Procurar bundle no servidor
    SERVER_BUNDLE=$(find /var/www/html/assets -name "*.js" -type f | head -1)
    if [ -n "$SERVER_BUNDLE" ]; then
        echo "✅ Bundle encontrado no servidor: $SERVER_BUNDLE"
        if grep -q "test-auth" "$SERVER_BUNDLE"; then
            echo "✅ 'test-auth' está no bundle do servidor!"
        else
            echo "❌ 'test-auth' NÃO está no bundle do servidor!"
            echo "   O servidor tem código antigo!"
            echo ""
            echo "SOLUÇÃO: Copiar dist/ para /var/www/html/"
            exit 1
        fi
    else
        echo "⚠️  Nenhum bundle encontrado em /var/www/html/assets/"
    fi
else
    echo "❌ /var/www/html/index.html NÃO existe!"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ VERIFICAÇÃO CONCLUÍDA"
echo "========================================"
echo ""
echo "Se 'test-auth' está no bundle mas ainda não funciona,"
echo "o problema é no Nginx ou no React Router."
echo "Execute: sudo ./CORRIGIR_NGINX_SPA.sh"
echo ""

