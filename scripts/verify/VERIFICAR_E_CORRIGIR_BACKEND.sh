#!/bin/bash
set -e

echo "🔍 VERIFICANDO E CORRIGINDO BACKEND"
echo "===================================="
echo ""

cd /root/primecamp-ofc || {
    echo "❌ Erro: Diretório /root/primecamp-ofc não encontrado"
    exit 1
}

# 1. Verificar se backend está rodando
echo "1️⃣ Verificando se backend está rodando..."
if pm2 list | grep -q "primecamp-api.*online"; then
    echo "   ✅ Backend está rodando"
    BACKEND_RUNNING=true
else
    echo "   ❌ Backend NÃO está rodando"
    BACKEND_RUNNING=false
fi

# 2. Verificar porta 3000
echo ""
echo "2️⃣ Verificando porta 3000..."
if lsof -ti:3000 > /dev/null 2>&1; then
    PID=$(lsof -ti:3000 | head -1)
    echo "   ⚠️  Porta 3000 está ocupada (PID: $PID)"
    PORT_OCCUPIED=true
else
    echo "   ✅ Porta 3000 está livre"
    PORT_OCCUPIED=false
fi

# 3. Se backend não está rodando OU porta ocupada, corrigir
if [ "$BACKEND_RUNNING" = false ] || [ "$PORT_OCCUPIED" = true ]; then
    echo ""
    echo "3️⃣ Corrigindo problema..."
    
    # Parar PM2
    echo "   Parando PM2..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    sleep 2
    
    # Matar processos na porta 3000
    if [ "$PORT_OCCUPIED" = true ]; then
        echo "   Liberando porta 3000..."
        kill -9 "$PID" 2>/dev/null || true
        pkill -f "node.*3000" 2>/dev/null || true
        fuser -k 3000/tcp 2>/dev/null || true
        sleep 2
    fi
    
    # Atualizar código
    echo "   Atualizando código..."
    git pull origin main
    
    # Iniciar backend
    echo "   Iniciando backend..."
    cd server
    pm2 start index.js --name primecamp-api
    sleep 5
    
    echo "   ✅ Backend reiniciado"
else
    echo ""
    echo "3️⃣ Backend parece estar OK, mas verificando atualização..."
    git pull origin main
    
    # Verificar se precisa reiniciar
    if [ $(git diff HEAD@{1} --name-only | grep -c "server/") -gt 0 ]; then
        echo "   Mudanças detectadas no backend, reiniciando..."
        cd server
        pm2 restart primecamp-api
        sleep 3
    else
        echo "   Nenhuma mudança no backend"
    fi
fi

# 4. Verificar status final
echo ""
echo "4️⃣ Verificando status final..."
pm2 status

echo ""
echo "📋 Últimos logs do backend:"
sleep 2
pm2 logs primecamp-api --lines 20 --nostream | tail -20

echo ""
echo "🏥 Testando health check..."
sleep 2
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo "   ✅ Backend está respondendo (HTTP $HEALTH)"
else
    echo "   ❌ Backend não está respondendo (HTTP $HEALTH)"
    echo ""
    echo "   📋 Verifique os logs:"
    echo "   pm2 logs primecamp-api --lines 50"
fi

echo ""
echo "✅ VERIFICAÇÃO CONCLUÍDA!"
echo ""
echo "💡 Se ainda tiver problemas de login:"
echo "   1. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "   2. Faça logout e login novamente"
echo "   3. Verifique se JWT_SECRET está configurado no .env"
