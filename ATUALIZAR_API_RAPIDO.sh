#!/bin/bash

echo "⚡ ATUALIZAÇÃO RÁPIDA DA API"
echo "============================"
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

# 1. Atualizar código
echo "1. Atualizando código..."
git pull origin main || { echo "❌ Erro: git pull falhou"; exit 1; }
echo "✅ Código atualizado"

# 2. Matar processos na porta 3000
echo ""
echo "2. Parando API antiga..."
pm2 stop primecamp-api 2>/dev/null || true
pm2 delete primecamp-api 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
pkill -9 -f "node.*index.js" 2>/dev/null || true
sleep 2
echo "✅ Processos parados"

# 3. Reiniciar API
echo ""
echo "3. Reiniciando API..."
cd server || { echo "❌ Erro: Não foi possível entrar no diretório server"; exit 1; }
pm2 start index.js --name primecamp-api || { echo "❌ Erro: Falha ao iniciar API"; exit 1; }
sleep 5
echo "✅ API reiniciada"

# 4. Testar API
echo ""
echo "4. Testando API..."
for i in {1..5}; do
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    if [ "$HEALTH" = "200" ]; then
        echo "✅ API está respondendo (200 OK)"
        curl -s http://localhost:3000/api/health
        echo ""
        exit 0
    fi
    if [ $i -eq 5 ]; then
        echo "❌ ERRO: API não está respondendo!"
        echo "📋 Logs:"
        pm2 logs primecamp-api --lines 20 --nostream
        exit 1
    fi
    echo "   Tentativa $i/5 falhou (código: ${HEALTH:-timeout}), aguardando..."
    sleep 2
done


