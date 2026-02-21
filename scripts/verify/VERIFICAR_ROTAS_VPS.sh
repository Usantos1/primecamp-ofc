#!/bin/bash

echo "=========================================="
echo "VERIFICANDO ROTAS DE REVENDA NO VPS"
echo "=========================================="

cd /root/primecamp-ofc

echo ""
echo "1. Verificando se o arquivo existe..."
if [ -f "server/routes/reseller.js" ]; then
    echo "✅ Arquivo server/routes/reseller.js existe"
    echo "   Tamanho: $(wc -l < server/routes/reseller.js) linhas"
else
    echo "❌ Arquivo server/routes/reseller.js NÃO existe!"
    exit 1
fi

echo ""
echo "2. Verificando sintaxe do arquivo..."
node --check server/routes/reseller.js
if [ $? -eq 0 ]; then
    echo "✅ Sintaxe do arquivo está correta"
else
    echo "❌ Erro de sintaxe no arquivo!"
    exit 1
fi

echo ""
echo "3. Verificando se está sendo importado no index.js..."
if grep -q "resellerRoutes" server/index.js; then
    echo "✅ Import encontrado no index.js"
    grep -n "resellerRoutes" server/index.js | head -3
else
    echo "❌ Import não encontrado no index.js!"
    exit 1
fi

echo ""
echo "4. Verificando logs do PM2..."
pm2 logs primecamp-api --lines 30 --nostream | grep -i "revenda\|reseller\|error" | tail -10

echo ""
echo "5. Testando se o servidor está respondendo..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/health

echo ""
echo "=========================================="
echo "VERIFICAÇÃO CONCLUÍDA!"
echo "=========================================="

