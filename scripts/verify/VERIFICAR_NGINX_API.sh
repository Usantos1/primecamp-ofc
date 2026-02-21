#!/bin/bash

echo "=========================================="
echo "VERIFICANDO CONFIGURAÇÃO NGINX PARA API"
echo "=========================================="

echo ""
echo "1. Procurando configuração do Nginx para api.primecamp.cloud..."
find /etc/nginx -name "*api*" -o -name "*primecamp*" 2>/dev/null | head -5

echo ""
echo "2. Verificando sites disponíveis..."
ls -la /etc/nginx/sites-available/ | grep -i "api\|primecamp"

echo ""
echo "3. Verificando sites habilitados..."
ls -la /etc/nginx/sites-enabled/ | grep -i "api\|primecamp"

echo ""
echo "4. Verificando se há proxy_pass para /api..."
grep -r "proxy_pass.*3000\|location.*api" /etc/nginx/sites-available/ 2>/dev/null | head -10

echo ""
echo "5. Testando localhost:3000 diretamente..."
curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ4M2RlYzVhLTc3MDktNGE2YS1iNzFmLWI1MjMxZDMzYTJmYyIsImVtYWlsIjoibG9qYXByaW1lY2FtcEBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Njc3Mjc5MDcsImV4cCI6MTc2ODMzMjcwN30.wLi89HRk6pVVA8n2thV0NspT_RQFryaMFCqVc_pWZ-k" \
  http://localhost:3000/api/admin/revenda/plans | head -30

echo ""
echo "=========================================="
echo "VERIFICAÇÃO CONCLUÍDA!"
echo "=========================================="

