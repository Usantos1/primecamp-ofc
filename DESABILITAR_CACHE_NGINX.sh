#!/bin/bash

echo "🔧 Desabilitando cache do Nginx temporariamente..."
echo "=================================================="
echo ""

NGINX_CONFIG="/etc/nginx/sites-available/default"

# Procurar configuração do Nginx
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "Procurando configuração do Nginx..."
    NGINX_CONFIG=$(find /etc/nginx -name "*.conf" -o -name "*primecamp*" 2>/dev/null | grep -v "default.d" | head -1)
    if [ -z "$NGINX_CONFIG" ]; then
        echo "❌ Configuração do Nginx não encontrada!"
        echo "   Verificando configurações disponíveis:"
        ls -la /etc/nginx/sites-available/ 2>/dev/null
        ls -la /etc/nginx/conf.d/ 2>/dev/null
        exit 1
    fi
fi

echo "✅ Configuração encontrada: $NGINX_CONFIG"

# Fazer backup
echo ""
echo "1️⃣ Criando backup..."
sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo "   ✅ Backup criado"

echo ""
echo "2️⃣ Modificando configuração para desabilitar cache de JS/CSS..."

# Criar arquivo temporário com modificações
TEMP_CONFIG=$(mktemp)

# Ler configuração e modificar
sudo cat "$NGINX_CONFIG" | sed \
  -e 's|expires 1y;|# expires 1y; # Temporariamente desabilitado|g' \
  -e 's|add_header Cache-Control "public, immutable";|add_header Cache-Control "no-cache, no-store, must-revalidate";\n        add_header Pragma "no-cache";\n        add_header Expires "0";|g' \
  > "$TEMP_CONFIG"

# Verificar se a modificação funcionou
if grep -q "no-cache" "$TEMP_CONFIG"; then
    echo "   ✅ Modificações aplicadas"
else
    echo "   ⚠️ Modificações não aplicadas, tentando método alternativo..."
    
    # Método alternativo: adicionar bloco específico para assets
    sudo cat "$NGINX_CONFIG" > "$TEMP_CONFIG"
    
    # Se já existe bloco de cache, substituir
    if grep -q "location ~\* \\.(js|css" "$TEMP_CONFIG"; then
        sudo sed -i 's|location ~\* \\.(js|css.*|location ~\* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n        add_header Cache-Control "no-cache, no-store, must-revalidate";\n        add_header Pragma "no-cache";\n        add_header Expires "0";|g' "$TEMP_CONFIG"
    else
        # Adicionar novo bloco antes do fechamento do server
        sudo awk '/^}$/ {print "    # Cache desabilitado temporariamente\n    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n        add_header Cache-Control \"no-cache, no-store, must-revalidate\";\n        add_header Pragma \"no-cache\";\n        add_header Expires \"0\";\n    }\n}"; next}1' "$TEMP_CONFIG" > "${TEMP_CONFIG}.new"
        mv "${TEMP_CONFIG}.new" "$TEMP_CONFIG"
    fi
fi

echo ""
echo "3️⃣ Verificando sintaxe do Nginx..."
if sudo nginx -t -c "$TEMP_CONFIG" 2>/dev/null || sudo nginx -t 2>/dev/null; then
    echo "   ✅ Sintaxe OK"
    
    echo ""
    echo "4️⃣ Aplicando configuração..."
    sudo mv "$TEMP_CONFIG" "$NGINX_CONFIG"
    
    echo ""
    echo "5️⃣ Recarregando Nginx..."
    sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Nginx recarregado com sucesso!"
    else
        echo "   ❌ Erro ao recarregar Nginx!"
        echo "   Restaurando backup..."
        sudo cp "${NGINX_CONFIG}.backup."* "$NGINX_CONFIG" 2>/dev/null
        sudo systemctl reload nginx
        exit 1
    fi
else
    echo "   ❌ Erro de sintaxe! Restaurando backup..."
    sudo cp "${NGINX_CONFIG}.backup."* "$NGINX_CONFIG" 2>/dev/null
    rm -f "$TEMP_CONFIG"
    exit 1
fi

echo ""
echo "✅ Cache do Nginx DESABILITADO temporariamente!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "   1. No navegador, abra DevTools (F12)"
echo "   2. Vá em Network tab"
echo "   3. Marque 'Disable cache' (se disponível)"
echo "   4. OU limpe o cache: Ctrl+Shift+Delete → Limpar tudo"
echo "   5. Recarregue a página: Ctrl+Shift+R"
echo "   6. Verifique no Network tab qual arquivo JS está sendo carregado"
echo "   7. Deve ser: index-B3J_Mk_8.js"
echo ""
echo "⚠️ IMPORTANTE: Após confirmar que funciona, você pode reabilitar o cache"
echo "   executando: sudo cp ${NGINX_CONFIG}.backup.* $NGINX_CONFIG && sudo systemctl reload nginx"

