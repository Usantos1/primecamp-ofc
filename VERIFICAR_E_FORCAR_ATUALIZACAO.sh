#!/bin/bash
set -e

echo "🔍 Verificando se o build está atualizado..."

cd /root/primecamp-ofc

# Verificar se o dist/index.html existe e quando foi modificado
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html encontrado"
    echo "📅 Última modificação: $(stat -c %y dist/index.html)"
    
    # Verificar qual bundle JS está referenciado no index.html
    echo ""
    echo "📦 Bundles JS referenciados no index.html:"
    grep -o 'assets/index-[^"]*\.js' dist/index.html | head -3
    
    # Verificar se os arquivos existem
    echo ""
    echo "🔍 Verificando se os bundles existem no dist:"
    for file in $(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -3); do
        if [ -f "dist/$file" ]; then
            echo "  ✅ $file existe"
        else
            echo "  ❌ $file NÃO existe"
        fi
    done
else
    echo "❌ dist/index.html não encontrado! Execute 'npm run build' primeiro."
    exit 1
fi

echo ""
echo "🔄 Verificando se o index.html no servidor está atualizado..."

# Comparar timestamp do index.html local com o do servidor
if [ -f "/var/www/html/index.html" ]; then
    LOCAL_TIME=$(stat -c %Y dist/index.html 2>/dev/null || echo "0")
    SERVER_TIME=$(stat -c %Y /var/www/html/index.html 2>/dev/null || echo "0")
    
    if [ "$LOCAL_TIME" -gt "$SERVER_TIME" ]; then
        echo "⚠️  O index.html no servidor está DESATUALIZADO!"
        echo "📤 Fazendo deploy do frontend..."
        
        sudo rm -rf /var/www/html/*
        sudo cp -r dist/* /var/www/html/
        sudo chown -R www-data:www-data /var/www/html
        sudo chmod -R 755 /var/www/html
        
        echo "✅ Frontend atualizado no servidor"
    else
        echo "✅ O index.html no servidor está atualizado"
    fi
else
    echo "⚠️  /var/www/html/index.html não existe. Fazendo deploy..."
    sudo rm -rf /var/www/html/*
    sudo cp -r dist/* /var/www/html/
    sudo chown -R www-data:www-data /var/www/html
    sudo chmod -R 755 /var/www/html
    echo "✅ Frontend deployado"
fi

echo ""
echo "🧹 Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

echo ""
echo "✅ Verificação concluída!"
echo ""
echo "💡 Se ainda não funcionar no navegador:"
echo "   1. Limpe o cache do navegador (Ctrl+Shift+Delete)"
echo "   2. Faça hard refresh (Ctrl+Shift+R)"
echo "   3. Teste em aba anônima/privada"
