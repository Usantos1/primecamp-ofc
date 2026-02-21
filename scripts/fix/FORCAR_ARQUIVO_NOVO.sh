#!/bin/bash

echo "🔥 FORÇANDO CARREGAMENTO DO ARQUIVO NOVO"
echo "========================================"
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Verificando arquivos no dist..."
BUNDLE_FILE=$(find dist/assets -name "index-*.js" -type f ! -name "*.es.js" | head -1)

if [ -z "$BUNDLE_FILE" ]; then
    echo "❌ Arquivo bundle não encontrado no dist!"
    exit 1
fi

BUNDLE_NAME=$(basename "$BUNDLE_FILE")
echo "   Arquivo encontrado: $BUNDLE_NAME"

echo ""
echo "2️⃣ Removendo arquivo antigo do servidor web (se existir)..."
sudo rm -f /var/www/html/assets/index-ecSPLH9U.js
sudo rm -f /var/www/html/assets/index-*.js.bak
echo "   ✅ Arquivos antigos removidos"

echo ""
echo "3️⃣ Copiando arquivo novo..."
sudo cp "$BUNDLE_FILE" /var/www/html/assets/
sudo chown www-data:www-data /var/www/html/assets/"$BUNDLE_NAME"
echo "   ✅ Arquivo copiado: $BUNDLE_NAME"

echo ""
echo "4️⃣ Verificando index.html..."
if grep -q "index-ecSPLH9U.js" /var/www/html/index.html; then
    echo "   ⚠️ index.html ainda referencia arquivo antigo!"
    echo "   Atualizando index.html..."
    sudo sed -i 's/index-ecSPLH9U\.js/'"$BUNDLE_NAME"'/g' /var/www/html/index.html
    echo "   ✅ index.html atualizado"
else
    echo "   ✅ index.html já referencia arquivo correto"
fi

echo ""
echo "5️⃣ Verificando se há service workers..."
if [ -f "/var/www/html/sw.js" ] || [ -f "/var/www/html/service-worker.js" ]; then
    echo "   ⚠️ Service worker encontrado! Removendo..."
    sudo rm -f /var/www/html/sw.js
    sudo rm -f /var/www/html/service-worker.js
    echo "   ✅ Service workers removidos"
else
    echo "   ✅ Nenhum service worker encontrado"
fi

echo ""
echo "6️⃣ Adicionando headers anti-cache no Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/default"
if [ ! -f "$NGINX_CONFIG" ]; then
    NGINX_CONFIG=$(find /etc/nginx -name "*.conf" -o -name "*primecamp*" 2>/dev/null | grep -v "default.d" | head -1)
fi

if [ -f "$NGINX_CONFIG" ]; then
    # Fazer backup
    sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Adicionar headers anti-cache para index.html
    if ! grep -q "add_header.*no-cache.*index.html" "$NGINX_CONFIG"; then
        echo "   Adicionando headers anti-cache..."
        sudo sed -i '/location \/ {/a\
        add_header Cache-Control "no-cache, no-store, must-revalidate";\
        add_header Pragma "no-cache";\
        add_header Expires "0";
' "$NGINX_CONFIG"
    fi
    
    # Verificar sintaxe
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "   ✅ Nginx atualizado"
    else
        echo "   ⚠️ Erro de sintaxe, restaurando backup..."
        sudo cp "${NGINX_CONFIG}.backup."* "$NGINX_CONFIG" 2>/dev/null
    fi
else
    echo "   ⚠️ Configuração do Nginx não encontrada"
fi

echo ""
echo "7️⃣ Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
echo "   ✅ Cache limpo"

echo ""
echo "8️⃣ Verificando arquivo final..."
echo "   Arquivo referenciado no index.html:"
grep -o 'assets/index-[^"]*\.js' /var/www/html/index.html | head -1
echo ""
echo "   Arquivo disponível:"
ls /var/www/html/assets/index-*.js 2>/dev/null | grep -v "\.es\.js" | xargs basename | head -1

echo ""
echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "📋 TESTE AGORA:"
echo "   1. Feche TODAS as abas do navegador"
echo "   2. Abra uma NOVA janela anônima (Ctrl+Shift+N)"
echo "   3. Abra DevTools (F12) → Network tab"
echo "   4. Marque 'Disable cache'"
echo "   5. Acesse: https://primecamp.cloud/integracoes"
echo "   6. No Network tab, procure por 'index-' e verifique qual arquivo está sendo carregado"
echo "   7. Deve ser: $BUNDLE_NAME (NÃO index-ecSPLH9U.js)"
echo ""
echo "   Se ainda carregar o arquivo antigo, pode haver um CDN ou proxy na frente."
echo "   Verifique: curl -I https://primecamp.cloud/assets/index-B3J_Mk_8.js"

