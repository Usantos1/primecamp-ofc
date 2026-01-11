#!/bin/bash
# Script para corrigir erro EADDRINUSE na porta 3000

echo "🔍 Verificando processos na porta 3000..."
lsof -ti:3000 && echo "⚠️  Processo encontrado" || echo "✅ Porta livre"

echo ""
echo "🛑 Parando todos os processos PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

echo ""
echo "🔪 Matando processos na porta 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Nenhum processo para matar"

echo ""
echo "⏳ Aguardando 3 segundos..."
sleep 3

echo ""
echo "🔍 Verificando se a porta está livre agora..."
lsof -ti:3000 && echo "❌ Ainda há processos!" || echo "✅ Porta 3000 está livre"

echo ""
echo "🚀 Iniciando backend com PM2..."
cd /root/primecamp-ofc/server
pm2 start index.js --name primecamp-api

echo ""
echo "⏳ Aguardando backend inicializar..."
sleep 5

echo ""
echo "📋 Status do PM2:"
pm2 status

echo ""
echo "📋 Últimas 20 linhas do log (sem erros):"
pm2 logs primecamp-api --lines 20 --nostream | grep -v "EADDRINUSE" | tail -20

echo ""
echo "✅ Backend deve estar rodando agora!"
