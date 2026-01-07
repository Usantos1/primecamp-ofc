#!/bin/bash

echo "=========================================="
echo "VERIFICANDO SERVIDOR NO VPS"
echo "=========================================="

echo ""
echo "1. Verificando se o servidor está rodando..."
pm2 status

echo ""
echo "2. Verificando porta 3000..."
netstat -tlnp | grep 3000 || ss -tlnp | grep 3000

echo ""
echo "3. Testando localhost:3000 diretamente..."
curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ4M2RlYzVhLTc3MDktNGE2YS1iNzFmLWI1MjMxZDMzYTJmYyIsImVtYWlsIjoibG9qYXByaW1lY2FtcEBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Njc3Mjc5MDcsImV4cCI6MTc2ODMzMjcwN30.wLi89HRk6pVVA8n2thV0NspT_RQFryaMFCqVc_pWZ-k" \
  http://localhost:3000/api/admin/revenda/plans | head -20

echo ""
echo "4. Verificando logs recentes do servidor..."
pm2 logs primecamp-api --lines 10 --nostream | tail -10

echo ""
echo "5. Verificando se o código está atualizado..."
grep -n "Registrando rotas de revenda" server/index.js

echo ""
echo "=========================================="
echo "VERIFICAÇÃO CONCLUÍDA!"
echo "=========================================="

