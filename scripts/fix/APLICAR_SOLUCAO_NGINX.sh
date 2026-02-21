#!/bin/bash

echo "🔧 APLICANDO SOLUÇÃO DO NGINX (COMO FOI FEITO ANTES)"
echo "===================================================="
echo ""

# Encontrar configuração do Nginx
NGINX_CONFIG="/etc/nginx/sites-available/default"
if [ ! -f "$NGINX_CONFIG" ]; then
    NGINX_CONFIG=$(find /etc/nginx -name "*.conf" -o -name "*primecamp*" 2>/dev/null | grep -v "default.d" | head -1)
fi

if [ -z "$NGINX_CONFIG" ] || [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Configuração do Nginx não encontrada!"
    echo "   Verificando configurações disponíveis:"
    ls -la /etc/nginx/sites-available/ 2>/dev/null
    ls -la /etc/nginx/conf.d/ 2>/dev/null
    exit 1
fi

echo "✅ Configuração encontrada: $NGINX_CONFIG"

# Fazer backup
echo ""
echo "1️⃣ Criando backup..."
sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo "   ✅ Backup criado"

echo ""
echo "2️⃣ Verificando configuração atual..."
grep -A 10 "location /" "$NGINX_CONFIG" | head -15

echo ""
echo "3️⃣ Aplicando solução: Adicionando headers anti-cache para index.html..."

# Remover location = /index.html se já existir (para recriar)
sudo sed -i '/location = \/index.html/,/^    }$/d' "$NGINX_CONFIG"

# Adicionar location específico para index.html ANTES do location /
sudo sed -i '/location \/ {/i\
    # Anti-cache para index.html (solução aplicada anteriormente)\
    location = /index.html {\
        add_header Cache-Control "no-cache, no-store, must-revalidate";\
        add_header Pragma "no-cache";\
        add_header Expires "0";\
        add_header X-Content-Type-Options "nosniff";\
    }\
' "$NGINX_CONFIG"

echo ""
echo "4️⃣ Modificando cache de arquivos JS para não cachear (ou cachear com versão)..."

# Substituir cache de 1 ano por cache curto ou sem cache
if grep -q "expires 1y" "$NGINX_CONFIG"; then
    echo "   Modificando expires 1y para expires 0..."
    sudo sed -i 's|expires 1y;|expires 0;|g' "$NGINX_CONFIG"
fi

# Modificar Cache-Control de "public, immutable" para "no-cache"
if grep -q 'Cache-Control "public, immutable"' "$NGINX_CONFIG"; then
    echo "   Modificando Cache-Control..."
    sudo sed -i 's|add_header Cache-Control "public, immutable";|add_header Cache-Control "no-cache, must-revalidate";|g' "$NGINX_CONFIG"
fi

echo ""
echo "5️⃣ Verificando sintaxe..."
if sudo nginx -t; then
    echo "   ✅ Sintaxe OK"
else
    echo "   ❌ Erro de sintaxe! Restaurando backup..."
    sudo cp "${NGINX_CONFIG}.backup."* "$NGINX_CONFIG" 2>/dev/null
    exit 1
fi

echo ""
echo "6️⃣ Garantindo que arquivos estão corretos..."
cd /root/primecamp-ofc || exit 1
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

echo ""
echo "7️⃣ Limpando cache e reiniciando Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx
sleep 3

echo ""
echo "8️⃣ Verificando configuração aplicada..."
grep -A 5 "location = /index.html" "$NGINX_CONFIG"

echo ""
echo "9️⃣ Testando..."
echo "   Via localhost:"
curl -s http://localhost/ | grep -o 'assets/index-[^"]*\.js' | sort -u

echo ""
echo "   Via HTTPS:"
curl -s -H "Cache-Control: no-cache" https://primecamp.cloud/ | grep -o 'assets/index-[^"]*\.js' | sort -u

echo ""
echo "✅ SOLUÇÃO APLICADA!"
echo ""
echo "📋 TESTE NO NAVEGADOR:"
echo "   1. Feche TODAS as abas"
echo "   2. Abra janela anônima (Ctrl+Shift+N)"
echo "   3. Acesse: https://primecamp.cloud/integracoes"
echo "   4. Deve estar igual ao localhost agora"

