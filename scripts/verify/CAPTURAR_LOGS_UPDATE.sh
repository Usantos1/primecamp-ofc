#!/bin/bash

echo "🔍 CAPTURANDO LOGS DO UPDATE EM TEMPO REAL"
echo "==========================================="
echo ""
echo "📋 Instruções:"
echo "   1. Deixe este script rodando"
echo "   2. Tente finalizar uma venda no PDV"
echo "   3. Os logs do erro aparecerão aqui"
echo ""
echo "⏳ Aguardando erros de UPDATE..."
echo ""

pm2 logs primecamp-api --lines 0 | grep --line-buffered -i -E "\[Update\]|syntax error|WHERE|UPDATE.*SET"
