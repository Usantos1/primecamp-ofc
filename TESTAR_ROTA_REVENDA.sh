#!/bin/bash

echo "=========================================="
echo "TESTANDO ROTAS DE REVENDA"
echo "=========================================="
echo ""
echo "1. Verificando se o servidor está rodando..."
pm2 status | grep primecamp-api

echo ""
echo "2. Verificando logs recentes do servidor..."
pm2 logs primecamp-api --lines 20 --nostream | tail -20

echo ""
echo "3. Testando rota de planos (sem token - deve dar 401)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/admin/revenda/plans

echo ""
echo "4. Verificando se a rota está registrada..."
grep -n "app.use.*revenda" server/index.js

echo ""
echo "=========================================="
echo "TESTE CONCLUÍDO!"
echo "=========================================="

