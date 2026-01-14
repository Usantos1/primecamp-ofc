#!/bin/bash

echo "🔥 FORÇANDO VERSIONAMENTO DINÂMICO"
echo "==================================="
echo ""

NGINX_ROOT="/var/www/primecamp.cloud"

# Gerar timestamp único
TIMESTAMP=$(date +%s)
echo "Timestamp gerado: $TIMESTAMP"
echo ""

# Adicionar versionamento a TODOS os arquivos JS e CSS no index.html
echo "1️⃣ Adicionando versionamento ao index.html..."
sudo sed -i "s|src=\"/assets/\([^\"]*\)\"|src=\"/assets/\1?v=$TIMESTAMP\"|g" "$NGINX_ROOT/index.html"
sudo sed -i "s|href=\"/assets/\([^\"]*\)\"|href=\"/assets/\1?v=$TIMESTAMP\"|g" "$NGINX_ROOT/index.html"

# Também adicionar para arquivos que já podem ter versionamento
sudo sed -i "s|src=\"/assets/\([^\"]*\)?v=[^\"]*\"|src=\"/assets/\1?v=$TIMESTAMP\"|g" "$NGINX_ROOT/index.html"
sudo sed -i "s|href=\"/assets/\([^\"]*\)?v=[^\"]*\"|href=\"/assets/\1?v=$TIMESTAMP\"|g" "$NGINX_ROOT/index.html"

echo "   ✅ Versionamento adicionado"
echo ""

# Verificar resultado
echo "2️⃣ Verificando referências no index.html..."
echo "   Referências encontradas:"
grep -o 'assets/[^"]*\.\(js\|css\)[^"]*' "$NGINX_ROOT/index.html" | head -5

echo ""
echo "3️⃣ Verificando se o arquivo JS principal tem versionamento..."
if grep -q "index-B2StyxFt.js?v=" "$NGINX_ROOT/index.html"; then
    echo "   ✅ Arquivo JS principal tem versionamento"
    grep -o 'index-B2StyxFt.js?v=[^"]*' "$NGINX_ROOT/index.html" | head -1
else
    echo "   ❌ ERRO: Versionamento não foi aplicado!"
fi

echo ""
echo "4️⃣ Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo find /var/cache/nginx -type f -delete 2>/dev/null || true
sudo find /var/lib/nginx/cache -type f -delete 2>/dev/null || true

echo ""
echo "5️⃣ Reiniciando Nginx..."
sudo systemctl restart nginx

echo ""
echo "✅ VERSIONAMENTO APLICADO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "   1. No navegador, abra DevTools (F12)"
echo "   2. Vá em Network tab"
echo "   3. Marque 'Disable cache'"
echo "   4. Recarregue a página: Ctrl + Shift + R"
echo "   5. Verifique se o arquivo JS carregado tem ?v=$TIMESTAMP"
echo ""
