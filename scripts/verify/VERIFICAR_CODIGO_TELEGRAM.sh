#!/bin/bash

echo "🔍 Verificando se código do Telegram está no bundle..."
echo "======================================================"
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Procurando 'Integração Telegram' no dist/assets..."
BUNDLE_FILE=$(find dist/assets -name "index-*.js" -type f ! -name "*.es.js" | head -1)

if [ -z "$BUNDLE_FILE" ]; then
    echo "❌ Arquivo bundle não encontrado!"
    exit 1
fi

echo "   Arquivo: $(basename $BUNDLE_FILE)"
echo "   Tamanho: $(du -h "$BUNDLE_FILE" | cut -f1)"

echo ""
echo "2️⃣ Procurando por 'Integração Telegram'..."
if grep -q "Integração Telegram\|Integra.*o Telegram" "$BUNDLE_FILE" 2>/dev/null; then
    echo "   ✅ 'Integração Telegram' ENCONTRADO no bundle!"
    echo ""
    echo "   Contexto (primeiras 3 ocorrências):"
    grep -o "Integração Telegram\|Integra.*o Telegram" "$BUNDLE_FILE" 2>/dev/null | head -3
else
    echo "   ❌ 'Integração Telegram' NÃO encontrado no bundle!"
fi

echo ""
echo "3️⃣ Procurando por 'Chat ID'..."
if grep -q "Chat ID\|chat.*id" "$BUNDLE_FILE" 2>/dev/null; then
    echo "   ✅ 'Chat ID' encontrado!"
    grep -o "Chat ID[^<]*" "$BUNDLE_FILE" 2>/dev/null | head -3
else
    echo "   ❌ 'Chat ID' não encontrado!"
fi

echo ""
echo "4️⃣ Verificando se foi copiado para /var/www/html/..."
WEB_BUNDLE=$(find /var/www/html/assets -name "index-*.js" -type f ! -name "*.es.js" | head -1)

if [ -z "$WEB_BUNDLE" ]; then
    echo "   ❌ Bundle não encontrado em /var/www/html/"
    echo "   Execute: sudo cp -r dist/* /var/www/html/"
else
    echo "   ✅ Bundle encontrado: $(basename $WEB_BUNDLE)"
    
    if grep -q "Integração Telegram\|Integra.*o Telegram" "$WEB_BUNDLE" 2>/dev/null; then
        echo "   ✅ 'Integração Telegram' está no bundle do servidor web!"
    else
        echo "   ❌ 'Integração Telegram' NÃO está no bundle do servidor web!"
        echo "   Os arquivos podem estar desatualizados."
    fi
fi

echo ""
echo "5️⃣ Comparando datas de modificação..."
if [ -f "$BUNDLE_FILE" ] && [ -f "$WEB_BUNDLE" ]; then
    DIST_DATE=$(stat -c '%y' "$BUNDLE_FILE" 2>/dev/null || stat -f '%Sm' "$BUNDLE_FILE" 2>/dev/null)
    WEB_DATE=$(stat -c '%y' "$WEB_BUNDLE" 2>/dev/null || stat -f '%Sm' "$WEB_BUNDLE" 2>/dev/null)
    echo "   Dist: $DIST_DATE"
    echo "   Web:  $WEB_DATE"
    
    if [ "$DIST_DATE" != "$WEB_DATE" ]; then
        echo "   ⚠️ Datas diferentes! Execute: sudo cp -r dist/* /var/www/html/"
    else
        echo "   ✅ Datas iguais"
    fi
fi

