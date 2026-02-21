#!/bin/bash

echo "🔧 CORRIGINDO ROOT DO NGINX"
echo "============================"
echo ""

NGINX_CONFIG="/etc/nginx/sites-available/primecamp.cloud"

echo "1️⃣ Fazendo backup da configuração atual..."
sudo cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
echo "   ✅ Backup criado"

echo ""
echo "2️⃣ Corrigindo root de /var/www/html para /var/www/primecamp.cloud..."
sudo sed -i 's|root /var/www/html;|root /var/www/primecamp.cloud;|g' "$NGINX_CONFIG"
echo "   ✅ Root corrigido"

echo ""
echo "3️⃣ Verificando se a correção foi aplicada..."
if grep -q "root /var/www/primecamp.cloud;" "$NGINX_CONFIG"; then
    echo "   ✅ Root corrigido com sucesso"
    grep "root " "$NGINX_CONFIG"
else
    echo "   ❌ Erro: Root não foi corrigido!"
    exit 1
fi

echo ""
echo "4️⃣ Testando configuração do Nginx..."
if sudo nginx -t; then
    echo "   ✅ Configuração válida"
else
    echo "   ❌ Erro na configuração!"
    echo "   Restaurando backup..."
    sudo cp "$NGINX_CONFIG.backup."* "$NGINX_CONFIG" 2>/dev/null
    exit 1
fi

echo ""
echo "5️⃣ Reiniciando Nginx..."
sudo systemctl restart nginx
sleep 2

echo ""
echo "6️⃣ Verificando status do Nginx..."
sudo systemctl status nginx --no-pager | head -5

echo ""
echo "7️⃣ Testando acesso ao arquivo..."
if curl -I https://primecamp.cloud/assets/index-B2StyxFt.js 2>&1 | grep -q "200\|HTTP/2 200"; then
    echo "   ✅ Arquivo agora está acessível!"
    curl -I https://primecamp.cloud/assets/index-B2StyxFt.js 2>&1 | head -5
else
    echo "   ⚠️ Arquivo ainda retorna erro"
    curl -I https://primecamp.cloud/assets/index-B2StyxFt.js 2>&1 | head -5
fi

echo ""
echo "✅ Correção concluída!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "   1. No navegador, limpe o cache completamente"
echo "   2. Recarregue a página: Ctrl + Shift + R"
echo "   3. Verifique se o arquivo JS correto está sendo carregado"
echo ""
