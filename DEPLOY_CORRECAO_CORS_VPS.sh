#!/bin/bash

# Script para deploy da correção de CORS na VPS
# Uso: bash DEPLOY_CORRECAO_CORS_VPS.sh

set -e  # Parar em caso de erro

echo "🚀 DEPLOY - CORREÇÃO CORS e ENDPOINTS"
echo "======================================"
echo ""

cd /root/primecamp-ofc || { 
    echo "❌ Erro: Diretório /root/primecamp-ofc não encontrado."
    exit 1
}

echo "1️⃣ Atualizando código do repositório..."
git pull origin main || {
    echo "❌ Erro ao fazer pull. Verifique a conexão com o Git."
    exit 1
}
echo "✅ Código atualizado."

echo ""
echo "2️⃣ Verificando se o código foi atualizado..."
if grep -q "allowedHeaders.*Idempotency-Key" server/index.js; then
    echo "✅ Correção de CORS encontrada no código."
else
    echo "⚠️  Aviso: Correção de CORS não encontrada. Verifique o código."
fi

if grep -q "job-application-save-draft" server/index.js; then
    echo "✅ Endpoint job-application-save-draft encontrado."
else
    echo "❌ Endpoint job-application-save-draft NÃO encontrado!"
    exit 1
fi

if grep -q "job-application-submit" server/index.js; then
    echo "✅ Endpoint job-application-submit encontrado."
else
    echo "❌ Endpoint job-application-submit NÃO encontrado!"
    exit 1
fi

echo ""
echo "3️⃣ Instalando dependências do backend (se necessário)..."
cd server
npm install --production 2>&1 | tail -5
echo "✅ Dependências verificadas."

echo ""
echo "4️⃣ Reiniciando servidor API..."
cd /root/primecamp-ofc/server
pm2 restart primecamp-api || {
    echo "⚠️  Erro ao reiniciar com PM2. Tentando iniciar..."
    pm2 start index.js --name primecamp-api
}
sleep 3
echo "✅ Servidor reiniciado."

echo ""
echo "5️⃣ Verificando status do servidor..."
pm2 status

echo ""
echo "6️⃣ Verificando logs recentes..."
pm2 logs primecamp-api --lines 20 --nostream | tail -25

echo ""
echo "7️⃣ Testando health check..."
sleep 2
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Health check OK"
    curl -s http://localhost:3000/api/health
else
    echo "❌ Health check falhou. Verifique os logs acima."
fi

echo ""
echo "8️⃣ Testando endpoint job-application-submit (deve retornar 400, não 404)..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/functions/job-application-submit \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')
if [ "$TEST_RESPONSE" = "404" ]; then
    echo "❌ Endpoint retornou 404 - Endpoint não encontrado!"
    echo "   Verifique se o servidor foi reiniciado corretamente."
elif [ "$TEST_RESPONSE" = "400" ] || [ "$TEST_RESPONSE" = "500" ]; then
    echo "✅ Endpoint está respondendo (HTTP $TEST_RESPONSE - esperado para dados inválidos)"
else
    echo "⚠️  Endpoint retornou HTTP $TEST_RESPONSE"
fi

echo ""
echo "════════════════════════════════════════"
echo "✅ DEPLOY CONCLUÍDO"
echo "════════════════════════════════════════"
echo ""
echo "📋 Próximos passos:"
echo "   1. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "   2. Teste a candidatura novamente"
echo "   3. Os erros 404 e CORS devem estar resolvidos"
echo ""
echo "🔍 Comandos úteis:"
echo "   - Ver logs: pm2 logs primecamp-api --lines 50"
echo "   - Ver status: pm2 status"
echo "   - Reiniciar: pm2 restart primecamp-api"
echo ""
