#!/bin/bash

echo "🔍 VERIFICANDO TODOS OS LOGS DO PM2"
echo "===================================="
echo ""

echo "1️⃣ Status do PM2:"
pm2 status
echo ""

echo "2️⃣ Últimas 100 linhas do log de saída (out.log):"
pm2 logs primecamp-api --lines 100 --nostream 2>/dev/null | tail -50
echo ""

echo "3️⃣ Últimas 100 linhas do log de erro (error.log):"
pm2 logs primecamp-api --err --lines 100 --nostream 2>/dev/null | tail -50
echo ""

echo "4️⃣ Verificando se há processos PM2 duplicados:"
ps aux | grep "node.*index.js" | grep -v grep
echo ""

echo "5️⃣ Para ver logs em tempo real, execute:"
echo "   pm2 logs primecamp-api --lines 0 --raw"
