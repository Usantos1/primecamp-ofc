#!/bin/bash
set -e

echo "🔧 CORRIGINDO PORTA 3000 E REINICIANDO BACKEND"
echo "==============================================="
echo ""

cd /root/primecamp-ofc || {
    echo "❌ Erro: Diretório /root/primecamp-ofc não encontrado"
    exit 1
}

# 1. Parar todos os processos PM2
echo "1️⃣ Parando todos os processos PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2
echo "✅ PM2 parado"

# 2. Matar processos na porta 3000
echo ""
echo "2️⃣ Liberando porta 3000..."
PID=$(lsof -ti:3000 2>/dev/null || netstat -tlnp 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | head -1 || echo "")

if [ -n "$PID" ]; then
    echo "   Processo encontrado na porta 3000: PID $PID"
    kill -9 "$PID" 2>/dev/null || true
    sleep 2
    echo "✅ Processo morto"
else
    echo "   Nenhum processo encontrado na porta 3000"
fi

# Tentar outras formas de matar
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "index.js" 2>/dev/null || true
sleep 2

# Verificar se porta está livre
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Ainda há processos. Forçando..."
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 2
fi

echo "✅ Porta 3000 liberada"

# 3. Atualizar código
echo ""
echo "3️⃣ Atualizando código..."
git pull origin main
echo "✅ Código atualizado"

# 4. Limpar cache PM2
echo ""
echo "4️⃣ Limpando cache PM2..."
pm2 kill 2>/dev/null || true
sleep 2

# 5. Iniciar backend
echo ""
echo "5️⃣ Iniciando backend..."
cd server
pm2 start index.js --name primecamp-api
sleep 5

# 6. Verificar status
echo ""
echo "6️⃣ Verificando status..."
pm2 status

echo ""
echo "📋 Últimos logs (aguardando 3 segundos)..."
sleep 3
pm2 logs primecamp-api --lines 15 --nostream | tail -15

echo ""
echo "✅ BACKEND REINICIADO COM SUCESSO!"
echo ""
echo "💡 Teste: curl http://localhost:3000/api/health"
