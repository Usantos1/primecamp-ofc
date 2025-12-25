#!/bin/bash

echo "🔍 Verificando se a rota /test-auth está no código buildado..."

cd /root/primecamp-ofc || exit 1

echo ""
echo "1. Verificando código fonte..."
if grep -q "test-auth" src/App.tsx; then
    echo "✅ Rota encontrada no código fonte (src/App.tsx)"
else
    echo "❌ Rota NÃO encontrada no código fonte!"
    exit 1
fi

echo ""
echo "2. Verificando se TestAuth.tsx existe..."
if [ -f "src/pages/TestAuth.tsx" ]; then
    echo "✅ Arquivo TestAuth.tsx existe"
else
    echo "❌ Arquivo TestAuth.tsx NÃO existe!"
    exit 1
fi

echo ""
echo "3. Verificando se dist/index.html existe..."
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html existe"
else
    echo "❌ dist/index.html NÃO existe! Execute 'npm run build' primeiro."
    exit 1
fi

echo ""
echo "4. Procurando 'test-auth' nos arquivos JavaScript buildados..."
FOUND=$(grep -r "test-auth" dist/assets/*.js 2>/dev/null | wc -l)
if [ "$FOUND" -gt 0 ]; then
    echo "✅ Encontrado 'test-auth' em $FOUND arquivo(s) JavaScript"
    echo "   Arquivos:"
    grep -r "test-auth" dist/assets/*.js 2>/dev/null | head -3
else
    echo "⚠️  'test-auth' NÃO encontrado nos arquivos JavaScript buildados"
    echo "   Isso pode ser normal se o Vite otimizou o código"
fi

echo ""
echo "5. Procurando 'TestAuth' nos arquivos JavaScript buildados..."
FOUND=$(grep -r "TestAuth" dist/assets/*.js 2>/dev/null | wc -l)
if [ "$FOUND" -gt 0 ]; then
    echo "✅ Encontrado 'TestAuth' em $FOUND arquivo(s) JavaScript"
else
    echo "⚠️  'TestAuth' NÃO encontrado nos arquivos JavaScript buildados"
fi

echo ""
echo "6. Verificando arquivos em /var/www/html..."
if [ -f "/var/www/html/index.html" ]; then
    echo "✅ /var/www/html/index.html existe"
    
    # Verificar data de modificação
    DIST_DATE=$(stat -c %y dist/index.html 2>/dev/null | cut -d' ' -f1,2)
    HTML_DATE=$(stat -c %y /var/www/html/index.html 2>/dev/null | cut -d' ' -f1,2)
    
    echo "   Data do dist/index.html: $DIST_DATE"
    echo "   Data do /var/www/html/index.html: $HTML_DATE"
    
    if [ "$DIST_DATE" != "$HTML_DATE" ]; then
        echo "⚠️  AVISO: As datas são diferentes! O arquivo pode estar desatualizado."
        echo "   Execute: sudo cp -r dist/* /var/www/html/"
    else
        echo "✅ As datas são iguais - arquivo está atualizado"
    fi
else
    echo "❌ /var/www/html/index.html NÃO existe!"
    echo "   Execute: sudo cp -r dist/* /var/www/html/"
fi

echo ""
echo "7. Verificando se há 'test-auth' nos arquivos do servidor..."
if [ -d "/var/www/html/assets" ]; then
    FOUND=$(grep -r "test-auth" /var/www/html/assets/*.js 2>/dev/null | wc -l)
    if [ "$FOUND" -gt 0 ]; then
        echo "✅ Encontrado 'test-auth' em $FOUND arquivo(s) no servidor"
    else
        echo "⚠️  'test-auth' NÃO encontrado nos arquivos do servidor"
    fi
else
    echo "⚠️  Diretório /var/www/html/assets não existe"
fi

echo ""
echo "📋 CONCLUSÃO:"
echo "Se tudo estiver ✅, o problema é CACHE DO NAVEGADOR."
echo ""
echo "SOLUÇÃO NO NAVEGADOR:"
echo "1. Abra DevTools (F12)"
echo "2. Clique com botão direito no botão de refresh"
echo "3. Escolha 'Empty Cache and Hard Reload'"
echo "4. Ou: Ctrl + Shift + Delete → Limpar cache → Hard refresh (Ctrl + Shift + R)"
echo ""
echo "Se ainda não funcionar, tente:"
echo "- Abrir em janela anônima/privada"
echo "- Verificar console do navegador (F12) para erros"

