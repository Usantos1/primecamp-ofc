#!/bin/bash

echo "🔍 VERIFICANDO E APLICANDO FIX DO UPDATE"
echo "========================================="
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Atualizando código..."
git pull origin main
echo "   ✅ Código atualizado"
echo ""

echo "2️⃣ Verificando se a correção está no código..."
if grep -q "SELECT sale_origin FROM \${tableName} \${tempWhereClause}" server/index.js; then
    echo "   ✅ Correção encontrada (SELECT corrigido)"
else
    echo "   ❌ Correção NÃO encontrada no SELECT"
    grep -n "SELECT sale_origin FROM" server/index.js | head -1
fi
echo ""

echo "3️⃣ Verificando logs do PM2 para ver o SQL gerado..."
echo "   (Últimas 20 linhas dos logs)"
pm2 logs primecamp-api --lines 20 --nostream | tail -20
echo ""

echo "4️⃣ Reiniciando backend..."
cd server
pm2 restart primecamp-api
sleep 3
echo "   ✅ Backend reiniciado"
echo ""

echo "5️⃣ Verificando se o backend está rodando..."
pm2 status primecamp-api
echo ""

echo "✅ VERIFICAÇÃO COMPLETA!"
echo ""
echo "📋 Se o erro persistir, verifique os logs em tempo real:"
echo "   pm2 logs primecamp-api --lines 50"
echo ""
echo "💡 O erro 'syntax error at or near WHERE' pode ocorrer se:"
echo "   1. O código não foi atualizado (git pull)"
echo "   2. O backend não foi reiniciado (pm2 restart)"
echo "   3. Há um problema com o objeto 'where' sendo passado (verificar logs)"
