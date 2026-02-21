#!/bin/bash

echo "=== VERIFICAÇÃO DE REBUILD ==="
echo ""

cd /root/primecamp-ofc

echo "1. Data do código fonte:"
ls -lh src/main.tsx index.html | head -2
echo ""

echo "2. Data do build (dist/):"
if [ -d "dist" ]; then
    ls -lh dist/index*.js | head -1
else
    echo "❌ Diretório dist/ não existe! Execute: npm run build"
fi
echo ""

echo "3. Data dos arquivos no servidor (/var/www/html/):"
ls -lh /var/www/html/index*.js 2>/dev/null | head -1 || echo "❌ Arquivos não encontrados em /var/www/html/"
echo ""

echo "4. Verificando se interceptação está no index.html:"
if [ -f "/var/www/html/index.html" ]; then
    if grep -q "INTERCEPTAR SUPABASE" /var/www/html/index.html; then
        echo "✅ Interceptação encontrada no index.html"
    else
        echo "❌ Interceptação NÃO encontrada no index.html"
    fi
else
    echo "❌ index.html não encontrado em /var/www/html/"
fi
echo ""

echo "5. Verificando se limpeza está no index.html:"
if [ -f "/var/www/html/index.html" ]; then
    if grep -q "LIMPAR TODOS OS TOKENS" /var/www/html/index.html; then
        echo "✅ Limpeza automática encontrada no index.html"
    else
        echo "❌ Limpeza automática NÃO encontrada no index.html"
    fi
else
    echo "❌ index.html não encontrado em /var/www/html/"
fi
echo ""

echo "=== FIM DA VERIFICAÇÃO ==="

