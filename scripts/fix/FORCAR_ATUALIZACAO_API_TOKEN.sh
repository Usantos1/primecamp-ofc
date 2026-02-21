#!/bin/bash

echo "🔄 FORÇANDO ATUALIZAÇÃO E REINICIALIZAÇÃO"
echo "=========================================="

cd /root/primecamp-ofc || exit 1

echo "1. Fazendo pull do código..."
git pull origin main

echo ""
echo "2. Verificando se os logs de debug estão no código..."
if grep -q "API Token Validation" server/index.js; then
    echo "✅ Logs de debug encontrados no código"
else
    echo "❌ Logs de debug NÃO encontrados - código pode estar desatualizado"
fi

echo ""
echo "3. Parando servidor..."
pm2 stop primecamp-api
pm2 delete primecamp-api

echo ""
echo "4. Aguardando..."
sleep 2

echo ""
echo "5. Iniciando servidor novamente..."
cd server
pm2 start index.js --name primecamp-api

echo ""
echo "6. Aguardando servidor iniciar..."
sleep 5

echo ""
echo "7. Verificando status..."
pm2 status

echo ""
echo "8. Testando token com logs..."
echo "   Execute este comando em outro terminal:"
echo "   curl -X GET 'https://api.primecamp.cloud/api/v1/produtos?limit=5' -H 'Authorization: Bearer 33db39d91ff563f1b71a8f026392ef3f1a281bb9d58b296de514083e98fba123'"
echo ""
echo "9. Monitorando logs em tempo real..."
echo "   Execute: pm2 logs primecamp-api | grep -i 'token\|api'"
echo ""

