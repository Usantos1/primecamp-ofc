#!/bin/bash

echo "🔧 CORRIGINDO DEPLOY DIRETO - DETECTAR E COPIAR CORRETO"
echo "========================================================"
echo ""

cd /root/primecamp-ofc || exit 1

# Detectar diretório do Nginx automaticamente
echo "1️⃣ Detectando diretório root do Nginx..."
NGINX_ROOT=$(sudo grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-available/primecamp.cloud 2>/dev/null | grep "root" | awk '{print $2}' | sed 's/;//' || echo "")
if [ -z "$NGINX_ROOT" ]; then
    NGINX_ROOT=$(sudo grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-enabled/primecamp.cloud* 2>/dev/null | grep "root" | head -1 | awk '{print $2}' | sed 's/;//' || echo "")
fi
if [ -z "$NGINX_ROOT" ]; then
    NGINX_ROOT="/var/www/primecamp.cloud"
fi

echo "   Diretório detectado: $NGINX_ROOT"
echo ""

# Verificar se há build
if [ ! -d "dist" ]; then
    echo "2️⃣ Fazendo build..."
    npm run build
    echo "   ✅ Build concluído"
else
    echo "2️⃣ Build já existe, pulando..."
fi
echo ""

# Verificar qual JS o dist/index.html referencia
DIST_JS=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1 | sed 's|assets/||')
echo "3️⃣ Arquivo JS no build (dist/): $DIST_JS"
echo ""

# Limpar e copiar
echo "4️⃣ Limpando diretório do Nginx..."
sudo rm -rf "$NGINX_ROOT"/*
echo "   ✅ Limpeza concluída"
echo ""

echo "5️⃣ Copiando arquivos do build..."
sudo cp -r dist/* "$NGINX_ROOT/"
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"
echo "   ✅ Arquivos copiados"
echo ""

# Verificar qual JS o servidor/index.html referencia agora
SERVER_JS=$(grep -o 'assets/index-[^"]*\.js' "$NGINX_ROOT/index.html" | head -1 | sed 's|assets/||')
echo "6️⃣ Arquivo JS no servidor: $SERVER_JS"
if [ "$DIST_JS" == "$SERVER_JS" ]; then
    echo "   ✅ Arquivos sincronizados!"
else
    echo "   ⚠️  MISMATCH! Algo deu errado na cópia"
fi
echo ""

# Verificar se o arquivo JS existe
if [ -f "$NGINX_ROOT/assets/$SERVER_JS" ]; then
    echo "7️⃣ Arquivo JS existe no servidor: ✅"
    ls -lh "$NGINX_ROOT/assets/$SERVER_JS" | awk '{print "   Tamanho:", $5}'
else
    echo "7️⃣ Arquivo JS NÃO existe no servidor: ❌"
    echo "   Isso é o problema!"
fi
echo ""

# Limpar cache do Nginx
echo "8️⃣ Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/* /var/lib/nginx/cache/*
sudo systemctl reload nginx
echo "   ✅ Cache limpo e Nginx recarregado"
echo ""

# Verificar via HTTP
echo "9️⃣ Testando requisição HTTP real..."
HTTP_JS=$(curl -s https://primecamp.cloud/ | grep -o 'assets/index-[^"]*\.js' | head -1 | sed 's|assets/||')
echo "   Arquivo JS retornado pelo servidor HTTP: $HTTP_JS"
if [ "$SERVER_JS" == "$HTTP_JS" ]; then
    echo "   ✅ Servidor HTTP retornando arquivo correto!"
else
    echo "   ⚠️  Servidor HTTP retornando arquivo diferente!"
    echo "   Isso pode ser cache do Nginx ou proxy"
fi
echo ""

echo "✅ DEPLOY COMPLETO!"
echo ""
echo "📋 RESUMO:"
echo "   Build JS:     $DIST_JS"
echo "   Servidor JS:  $SERVER_JS"
echo "   HTTP JS:      $HTTP_JS"
echo ""
echo "🌐 Agora teste no navegador (modo anônimo):"
echo "   https://primecamp.cloud/admin/configuracoes/pagamentos"
echo ""
echo "💡 Se ainda não funcionar, verifique no DevTools → Network tab"
echo "   qual arquivo JS está sendo carregado"
