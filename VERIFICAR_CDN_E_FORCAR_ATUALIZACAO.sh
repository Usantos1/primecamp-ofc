#!/bin/bash

echo "🔍 VERIFICANDO CDN E FORÇANDO ATUALIZAÇÃO"
echo "=========================================="
echo ""

NGINX_ROOT="/var/www/primecamp.cloud"

echo "1️⃣ Verificando se há Cloudflare ou CDN..."
echo "   Testando headers HTTP..."
curl -I https://primecamp.cloud/ 2>/dev/null | grep -i "cloudflare\|cf-\|server:" || echo "   (Nenhum header de CDN detectado)"
echo ""

echo "2️⃣ Fazendo rebuild completo para gerar novo hash..."
cd /root/primecamp-ofc || exit 1

echo "   Limpando caches..."
rm -rf dist node_modules/.vite node_modules/.cache .vite .cache
echo "   ✅ Caches limpos"

echo ""
echo "   Fazendo build..."
npm run build
if [ $? -ne 0 ]; then
    echo "   ❌ Erro no build!"
    exit 1
fi
echo "   ✅ Build concluído"
echo ""

echo "3️⃣ Verificando novo arquivo JS gerado..."
NEW_JS_FILE=$(find dist/assets -name "index-*.js" -type f ! -name "*.es.js" | head -1 | xargs basename)
echo "   Novo arquivo JS: $NEW_JS_FILE"
echo ""

echo "4️⃣ Copiando para servidor..."
sudo rm -rf "$NGINX_ROOT"/*
sudo cp -r dist/* "$NGINX_ROOT"/
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"
echo "   ✅ Arquivos copiados"
echo ""

echo "5️⃣ Verificando se index.html referencia o novo arquivo..."
CURRENT_REF=$(grep -o 'assets/index-[^"]*\.js' "$NGINX_ROOT/index.html" | head -1 | sed 's|assets/||')
echo "   Arquivo referenciado: $CURRENT_REF"
if [ "$CURRENT_REF" == "$NEW_JS_FILE" ]; then
    echo "   ✅ index.html referencia o arquivo correto"
else
    echo "   ⚠️ Possível desincronização"
fi
echo ""

echo "6️⃣ Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/* /var/lib/nginx/cache/*
sudo systemctl reload nginx
echo "   ✅ Cache do Nginx limpo"
echo ""

echo "✅ REBUILD E DEPLOY COMPLETO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "   O arquivo JS agora tem um novo nome/hash, então o navegador DEVE buscar a nova versão"
echo "   Se ainda não funcionar, pode ser:"
echo "   1. CDN/Cloudflare cacheando (precisa purgar cache no CDN)"
echo "   2. Service Worker muito persistente (desregistrar manualmente no navegador)"
echo ""
