#!/bin/bash

echo "🔧 CORRIGINDO PM2 E PORTA 3000"
echo "==============================="
echo ""

echo "1️⃣ Matando processo na porta 3000..."
PID=$(lsof -ti:3000 2>/dev/null || fuser 3000/tcp 2>/dev/null | awk '{print $1}' || echo "")
if [ -n "$PID" ]; then
    echo "   Processo encontrado: $PID"
    kill -9 $PID 2>/dev/null || true
    sleep 1
    echo "   ✅ Processo morto"
else
    echo "   ✅ Nenhum processo na porta 3000"
fi
echo ""

echo "2️⃣ Parando PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2
echo "   ✅ PM2 parado"
echo ""

echo "3️⃣ Verificando se a porta 3000 está livre..."
if lsof -ti:3000 >/dev/null 2>&1; then
    echo "   ⚠️ Porta 3000 ainda está em uso!"
    lsof -i:3000
else
    echo "   ✅ Porta 3000 está livre"
fi
echo ""

echo "4️⃣ Iniciando backend..."
cd /root/primecamp-ofc/server
pm2 start index.js --name primecamp-api
sleep 3
echo ""

echo "5️⃣ Verificando status..."
pm2 status
echo ""

echo "6️⃣ Verificando logs recentes..."
pm2 logs primecamp-api --lines 20 --nostream | tail -20
echo ""

echo "✅ CONCLUÍDO!"
echo ""
echo "📋 Se o backend não iniciar, verifique:"
echo "   pm2 logs primecamp-api --lines 50"
