#!/bin/bash

echo "🔍 VERIFICANDO ARQUIVOS JS ANTIGOS NO SERVIDOR"
echo "=============================================="
echo ""

NGINX_ROOT="/var/www/primecamp.cloud"

echo "1️⃣ Verificando qual arquivo o index.html referencia..."
JS_REFERENCED=$(grep -o 'assets/index-[^"]*\.js' "$NGINX_ROOT/index.html" | head -1 | sed 's|assets/||')
echo "   ✅ Arquivo referenciado: $JS_REFERENCED"
echo ""

echo "2️⃣ Listando TODOS os arquivos JS no servidor..."
echo "   Arquivos JS encontrados:"
ls -lh "$NGINX_ROOT/assets/index-"*.js 2>/dev/null | awk '{print "   -", $9, "(" $5 ")"}'
echo ""

echo "3️⃣ Verificando se há arquivos JS antigos (diferentes do referenciado)..."
ALL_JS_FILES=$(ls "$NGINX_ROOT/assets/index-"*.js 2>/dev/null | wc -l)
if [ "$ALL_JS_FILES" -gt 1 ]; then
    echo "   ⚠️ Há $ALL_JS_FILES arquivos JS! Isso pode causar cache do navegador"
    echo "   Arquivos:"
    ls -lht "$NGINX_ROOT/assets/index-"*.js 2>/dev/null | awk '{print "   -", $9, "(" $5 ") -", $6, $7, $8}'
    echo ""
    echo "   💡 Solução: Remover arquivos JS antigos (exceto o referenciado)"
    echo "   Execute:"
    echo "   sudo rm -f $NGINX_ROOT/assets/index-Bebdfp69.js 2>/dev/null"
    echo "   sudo rm -f $NGINX_ROOT/assets/index-*.js ! -name '$JS_REFERENCED'"
else
    echo "   ✅ Apenas 1 arquivo JS encontrado (correto)"
fi
echo ""

echo "4️⃣ Verificando se o arquivo antigo (index-Bebdfp69.js) existe..."
if [ -f "$NGINX_ROOT/assets/index-Bebdfp69.js" ]; then
    echo "   ❌ Arquivo antigo index-Bebdfp69.js EXISTE!"
    echo "   ⚠️ Isso pode causar cache do navegador"
    echo "   Tamanho: $(du -h "$NGINX_ROOT/assets/index-Bebdfp69.js" | cut -f1)"
    echo "   Data de modificação: $(stat -c %y "$NGINX_ROOT/assets/index-Bebdfp69.js" 2>/dev/null || stat -f %Sm "$NGINX_ROOT/assets/index-Bebdfp69.js" 2>/dev/null)"
    echo ""
    echo "   💡 Recomendação: Remover este arquivo"
    echo "   sudo rm -f $NGINX_ROOT/assets/index-Bebdfp69.js"
else
    echo "   ✅ Arquivo antigo não existe (correto)"
fi
