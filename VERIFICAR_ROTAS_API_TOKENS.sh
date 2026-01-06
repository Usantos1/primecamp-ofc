#!/bin/bash

echo "🔍 VERIFICANDO ROTAS DE API TOKENS"
echo "===================================="
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

echo "1. Verificando se as rotas estão no código..."
if grep -q "app.get('/api/api-tokens'" server/index.js; then
    echo "✅ Rota GET encontrada no código"
else
    echo "❌ Rota GET NÃO encontrada no código!"
    exit 1
fi

if grep -q "app.post('/api/api-tokens'" server/index.js; then
    echo "✅ Rota POST encontrada no código"
else
    echo "❌ Rota POST NÃO encontrada no código!"
    exit 1
fi

echo ""
echo "2. Verificando se o servidor está rodando..."
if pm2 list | grep -q "primecamp-api"; then
    echo "✅ Servidor está rodando no PM2"
    pm2 status | grep primecamp-api
else
    echo "❌ Servidor NÃO está rodando!"
    echo "   Inicie com: pm2 start server/index.js --name primecamp-api"
    exit 1
fi

echo ""
echo "3. Verificando logs recentes do servidor..."
echo "   Procurando por 'api-tokens' ou 'API Tokens'..."
pm2 logs primecamp-api --lines 50 --nostream | grep -i "api-token\|API Token" || echo "   ⚠️  Nenhuma menção a api-tokens nos logs recentes"

echo ""
echo "4. Testando rota de teste (sem autenticação)..."
TEST_RESPONSE=$(curl -s http://localhost:3000/api/api-tokens/test)
if echo "$TEST_RESPONSE" | grep -q "funcionando"; then
    echo "✅ Rota de teste funcionando!"
    echo "   Resposta: $TEST_RESPONSE"
else
    echo "❌ Rota de teste NÃO está funcionando!"
    echo "   Resposta: $TEST_RESPONSE"
    echo "   Isso indica que o código não foi deployado ou o servidor precisa ser reiniciado"
fi

echo ""
echo "5. Verificando se as tabelas existem no banco..."
TABLES=$(psql -U postgres -d banco_gestao -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('api_tokens', 'api_access_logs');")
if [ "$TABLES" = "2" ]; then
    echo "✅ Ambas as tabelas existem no banco"
else
    echo "⚠️  Tabelas podem não existir (encontradas: $TABLES/2)"
    echo "   Execute: psql -U postgres -d banco_gestao -f CRIAR_TABELAS_API_TOKENS.sql"
fi

echo ""
echo "6. Verificando versão do código no servidor..."
echo "   Última modificação de server/index.js:"
ls -lh server/index.js | awk '{print "   "$6, $7, $8}'

echo ""
echo "📋 RESUMO:"
echo "   Se a rota de teste não funcionar, o código precisa ser deployado:"
echo "   1. git pull origin main"
echo "   2. pm2 restart primecamp-api"
echo ""
echo "   Se a rota de teste funcionar mas /api/api-tokens der 404,"
echo "   o problema pode ser de autenticação. Verifique os logs:"
echo "   pm2 logs primecamp-api --lines 100"

