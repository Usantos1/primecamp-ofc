#!/bin/bash

echo "🔧 RESOLVENDO PORTA 3000 EM USO E API TOKENS"
echo "=============================================="
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

echo "1. Verificando processos usando a porta 3000..."
PROCESS=$(lsof -ti:3000 || fuser 3000/tcp 2>/dev/null || netstat -tlnp | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | head -1)
if [ ! -z "$PROCESS" ]; then
    echo "⚠️  Processo encontrado na porta 3000: $PROCESS"
    echo "   Matando processo..."
    kill -9 $PROCESS 2>/dev/null || true
    sleep 2
else
    echo "✅ Nenhum processo encontrado na porta 3000"
fi

echo ""
echo "2. Parando todos os processos PM2 relacionados..."
pm2 stop all 2>/dev/null || true
pm2 delete primecamp-api 2>/dev/null || true
sleep 2

echo ""
echo "3. Verificando se a porta está livre agora..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "❌ Porta 3000 ainda está em uso!"
    echo "   Tentando forçar..."
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 2
else
    echo "✅ Porta 3000 está livre"
fi

echo ""
echo "4. Atualizando código..."
git pull origin main || { echo "⚠️  Git pull falhou ou já está atualizado"; }

echo ""
echo "5. Verificando se as tabelas existem..."
TABLES=$(psql -U postgres -d banco_gestao -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('api_tokens', 'api_access_logs');" 2>/dev/null)
if [ "$TABLES" != "2" ]; then
    echo "⚠️  Criando tabelas..."
    psql -U postgres -d banco_gestao -f CRIAR_TABELAS_API_TOKENS.sql 2>&1 | grep -v "NOTICE" || echo "   Tabelas já existem ou erro ao criar"
else
    echo "✅ Tabelas já existem"
fi

echo ""
echo "6. Iniciando servidor..."
cd server
pm2 start index.js --name primecamp-api || {
    echo "❌ Erro ao iniciar servidor"
    exit 1
}
cd ..

echo ""
echo "7. Aguardando servidor iniciar..."
sleep 5

echo ""
echo "8. Verificando status do PM2..."
pm2 status

echo ""
echo "9. Verificando logs de inicialização..."
pm2 logs primecamp-api --lines 30 --nostream | tail -20

echo ""
echo "10. Verificando se há erros..."
ERRORS=$(pm2 logs primecamp-api --lines 50 --nostream | grep -i "error\|erro\|EADDRINUSE" | tail -5)
if [ ! -z "$ERRORS" ]; then
    echo "⚠️  Erros encontrados:"
    echo "$ERRORS"
else
    echo "✅ Nenhum erro encontrado nos logs recentes"
fi

echo ""
echo "11. Testando rota de teste..."
sleep 2
TEST_RESPONSE=$(curl -s http://localhost:3000/api/api-tokens/test 2>&1)
if echo "$TEST_RESPONSE" | grep -q "funcionando"; then
    echo "✅ Rota de teste funcionando!"
    echo "   Resposta: $TEST_RESPONSE"
else
    echo "❌ Rota de teste não funcionou"
    echo "   Resposta: $TEST_RESPONSE"
    echo ""
    echo "   Verificando se servidor está escutando..."
    netstat -tlnp | grep 3000 || ss -tlnp | grep 3000 || echo "   Servidor não está escutando na porta 3000"
fi

echo ""
echo "12. Verificando logs de API tokens..."
pm2 logs primecamp-api --lines 50 --nostream | grep -i "api.*token\|tabelas.*api\|inicializada" || echo "   Nenhum log de API tokens encontrado"

echo ""
echo "════════════════════════════════════════"
echo "✅ PROCESSO CONCLUÍDO"
echo "════════════════════════════════════════"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Se a rota de teste funcionou, teste no navegador:"
echo "   https://api.primecamp.cloud/api/api-tokens/test"
echo ""
echo "2. Se ainda não funcionar, verifique:"
echo "   pm2 logs primecamp-api --lines 100"
echo ""
echo "3. Para monitorar logs em tempo real:"
echo "   pm2 logs primecamp-api"


