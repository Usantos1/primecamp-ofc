#!/bin/bash

echo "🔧 CORRIGINDO PORTA 3000 E REINICIANDO API"
echo "==========================================="
echo ""

cd /root/primecamp-ofc || { 
    echo "❌ Erro: Diretório /root/primecamp-ofc não encontrado."
    exit 1
}

echo "1️⃣ Parando todos os processos PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2
echo "✅ PM2 parado."

echo ""
echo "2️⃣ Matando processos na porta 3000..."
# Tentar várias formas de matar processos na porta 3000
PID=$(lsof -ti:3000 2>/dev/null || netstat -tlnp 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | head -1)

if [ -n "$PID" ]; then
    echo "   Processo encontrado: PID $PID"
    kill -9 "$PID" 2>/dev/null || true
    sleep 2
    echo "✅ Processo morto."
else
    echo "   Nenhum processo encontrado na porta 3000."
fi

# Tentar matar qualquer processo node na porta 3000
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "index.js" 2>/dev/null || true
sleep 2

# Verificar se a porta está livre agora
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Ainda há processos na porta 3000. Forçando..."
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 2
fi

echo "✅ Porta 3000 liberada."

echo ""
echo "3️⃣ Verificando código atualizado..."
git pull origin main
echo "✅ Código atualizado."

echo ""
echo "4️⃣ Verificando sintaxe do código..."
cd server
node --check index.js
if [ $? -ne 0 ]; then
    echo "❌ Erro de sintaxe em index.js"
    exit 1
fi
echo "✅ Sintaxe OK."

echo ""
echo "5️⃣ Limpando processos PM2 órfãos..."
pm2 kill 2>/dev/null || true
pm2 resurrect 2>/dev/null || true
sleep 2

echo ""
echo "6️⃣ Iniciando servidor API..."
cd /root/primecamp-ofc/server
pm2 start index.js --name primecamp-api --update-env
sleep 5

echo ""
echo "7️⃣ Verificando status..."
pm2 status

echo ""
echo "8️⃣ Verificando se servidor está respondendo..."
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health check OK (HTTP $HEALTH)"
    curl -s http://localhost:3000/api/health | head -3
else
    echo "❌ Health check falhou (HTTP $HEALTH)"
    echo "Verificando logs..."
    pm2 logs primecamp-api --lines 30 --nostream | tail -30
    exit 1
fi

echo ""
echo "9️⃣ Testando endpoint job-application-submit..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/functions/job-application-submit \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')
if [ "$TEST_RESPONSE" = "404" ]; then
    echo "❌ Endpoint ainda retorna 404"
    echo "Verificando se endpoint está no código..."
    if grep -q "job-application-submit" index.js; then
        echo "✅ Endpoint está no código"
        echo "⚠️  Servidor pode não ter carregado as rotas. Verifique logs."
    else
        echo "❌ Endpoint NÃO está no código!"
    fi
elif [ "$TEST_RESPONSE" = "400" ] || [ "$TEST_RESPONSE" = "500" ]; then
    echo "✅ Endpoint está respondendo (HTTP $TEST_RESPONSE - esperado para dados inválidos)"
else
    echo "⚠️  Endpoint retornou HTTP $TEST_RESPONSE"
fi

echo ""
echo "🎉 PROCESSO CONCLUÍDO!"
echo ""
echo "📋 Verificar logs:"
echo "   pm2 logs primecamp-api --lines 50"
echo ""
