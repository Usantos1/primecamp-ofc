#!/bin/bash

echo "🔍 Verificando se o código do Telegram está no build..."
echo "========================================================"
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Verificando arquivos no dist..."
if [ ! -d "dist" ]; then
    echo "❌ Diretório dist/ não existe! Execute: npm run build"
    exit 1
fi

echo ""
echo "2️⃣ Procurando por 'Integração Telegram' nos arquivos JS..."
BUNDLE_FILES=$(find dist/assets -name "*.js" -type f 2>/dev/null)
FOUND=0

for file in $BUNDLE_FILES; do
    if grep -q "Integração Telegram\|Integra.*o Telegram\|Chat ID.*Entrada\|Chat ID.*Processo\|Chat ID.*Saída" "$file" 2>/dev/null; then
        echo "   ✅ Encontrado em: $(basename $file)"
        echo "      Tamanho: $(du -h "$file" | cut -f1)"
        FOUND=1
        # Mostrar contexto
        echo "      Contexto:"
        grep -o "Integração Telegram\|Chat ID.*Entrada\|Chat ID.*Processo\|Chat ID.*Saída" "$file" 2>/dev/null | head -3
        break
    fi
done

if [ $FOUND -eq 0 ]; then
    echo "   ❌ NÃO encontrado nos arquivos JS!"
    echo ""
    echo "3️⃣ Verificando arquivos JS disponíveis..."
    ls -lh dist/assets/*.js | head -5
    echo ""
    echo "4️⃣ Verificando se Integration.tsx está sendo importado..."
    # Procurar por imports relacionados
    for file in $BUNDLE_FILES; do
        if grep -q "integration\|Integration\|integracoes" "$file" 2>/dev/null; then
            echo "   Arquivo relacionado: $(basename $file)"
            grep -o "integration\|Integration\|integracoes" "$file" 2>/dev/null | head -3
        fi
    done
else
    echo ""
    echo "✅ Código do Telegram encontrado no build!"
fi

echo ""
echo "5️⃣ Verificando se os arquivos foram copiados para /var/www/html/..."
if grep -q "Integração Telegram\|Chat ID.*Entrada" /var/www/html/assets/*.js 2>/dev/null; then
    echo "   ✅ Código encontrado em /var/www/html/"
else
    echo "   ❌ Código NÃO encontrado em /var/www/html/"
    echo "   Execute: sudo cp -r dist/* /var/www/html/"
fi

echo ""
echo "6️⃣ Verificando data de modificação..."
if [ -f "/var/www/html/index.html" ]; then
    echo "   index.html: $(stat -c '%y' /var/www/html/index.html 2>/dev/null || stat -f '%Sm' /var/www/html/index.html 2>/dev/null)"
fi

JS_FILE=$(ls -t /var/www/html/assets/*.js 2>/dev/null | head -1)
if [ -n "$JS_FILE" ]; then
    echo "   Bundle JS: $(stat -c '%y' "$JS_FILE" 2>/dev/null || stat -f '%Sm' "$JS_FILE" 2>/dev/null)"
fi

