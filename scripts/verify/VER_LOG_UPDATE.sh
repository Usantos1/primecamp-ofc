#!/bin/bash

echo "🔍 VERIFICANDO LOGS DE SAÍDA (OUT) DO PM2"
echo "=========================================="
echo ""

echo "Últimas 100 linhas do log de saída (onde estão os console.log):"
pm2 logs primecamp-api --lines 100 --nostream 2>/dev/null | grep -E "\[Update\]|syntax error|Erro ao atualizar|UPDATE.*SET" | tail -30

echo ""
echo "📋 Para ver logs em tempo real, execute:"
echo "   pm2 logs primecamp-api --lines 0"
echo ""
echo "💡 Depois, tente finalizar uma venda e os logs aparecerão aqui"
