#!/bin/bash

echo "🔧 Corrigindo index.html para usar arquivos corretos..."
echo "======================================================="
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Verificando index.html no dist..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ dist/index.html não existe! Execute: npm run build"
    exit 1
fi

echo ""
echo "2️⃣ Verificando qual arquivo JS está sendo referenciado..."
grep -o 'assets/index-[^"]*\.js' dist/index.html | head -3

echo ""
echo "3️⃣ Verificando arquivos JS disponíveis no dist/assets..."
ls -lh dist/assets/index-*.js 2>/dev/null | grep -v "\.es\.js" | head -3

echo ""
echo "4️⃣ Verificando index.html no servidor web..."
if [ -f "/var/www/html/index.html" ]; then
    echo "   Arquivo JS referenciado:"
    grep -o 'assets/index-[^"]*\.js' /var/www/html/index.html | head -3
    
    echo ""
    echo "   Arquivos JS disponíveis em /var/www/html/assets/:"
    ls -lh /var/www/html/assets/index-*.js 2>/dev/null | grep -v "\.es\.js" | head -3
    
    # Verificar se há mismatch
    REFERENCED=$(grep -o 'assets/index-[^"]*\.js' /var/www/html/index.html | head -1 | sed 's/assets\///')
    ACTUAL=$(ls /var/www/html/assets/index-*.js 2>/dev/null | grep -v "\.es\.js" | head -1 | xargs basename)
    
    echo ""
    echo "   Referenciado: $REFERENCED"
    echo "   Disponível:   $ACTUAL"
    
    if [ "$REFERENCED" != "$ACTUAL" ]; then
        echo ""
        echo "   ⚠️ MISMATCH! O index.html está referenciando arquivo antigo!"
        echo "   Recopiando arquivos..."
        sudo rm -rf /var/www/html/*
        sudo cp -r dist/* /var/www/html/
        sudo chown -R www-data:www-data /var/www/html/
        
        echo ""
        echo "   Verificando novamente..."
        NEW_REFERENCED=$(grep -o 'assets/index-[^"]*\.js' /var/www/html/index.html | head -1 | sed 's/assets\///')
        NEW_ACTUAL=$(ls /var/www/html/assets/index-*.js 2>/dev/null | grep -v "\.es\.js" | head -1 | xargs basename)
        echo "   Referenciado: $NEW_REFERENCED"
        echo "   Disponível:   $NEW_ACTUAL"
        
        if [ "$NEW_REFERENCED" = "$NEW_ACTUAL" ]; then
            echo "   ✅ Agora está correto!"
        fi
    else
        echo "   ✅ Arquivos estão corretos"
    fi
else
    echo "   ❌ /var/www/html/index.html não existe!"
fi

echo ""
echo "5️⃣ Limpando cache do Nginx completamente..."
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
echo "   ✅ Cache limpo"

echo ""
echo "6️⃣ Verificando se há service worker ou cache do navegador..."
if [ -f "/var/www/html/sw.js" ] || [ -f "/var/www/html/service-worker.js" ]; then
    echo "   ⚠️ Service worker encontrado! Isso pode estar causando cache."
    echo "   Arquivos encontrados:"
    ls -lh /var/www/html/sw*.js /var/www/html/service-worker*.js 2>/dev/null
else
    echo "   ✅ Nenhum service worker encontrado"
fi

echo ""
echo "✅ Verificação concluída!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "   1. No navegador, abra DevTools (F12)"
echo "   2. Vá em Application/Storage → Clear storage"
echo "   3. Marque tudo e clique em 'Clear site data'"
echo "   4. OU use modo anônimo: Ctrl+Shift+N"
echo "   5. Acesse: https://primecamp.cloud/integracoes"
echo "   6. Abra Network tab e verifique qual arquivo JS está sendo carregado"
echo "   7. Deve ser: index-B3J_Mk_8.js (não index-ecSPLH9U.js)"

