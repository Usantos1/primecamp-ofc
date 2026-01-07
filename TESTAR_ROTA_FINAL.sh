#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ4M2RlYzVhLTc3MDktNGE2YS1iNzFmLWI1MjMxZDMzYTJmYyIsImVtYWlsIjoibG9qYXByaW1lY2FtcEBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Njc3Mjc5MDcsImV4cCI6MTc2ODMzMjcwN30.wLi89HRk6pVVA8n2thV0NspT_RQFryaMFCqVc_pWZ-k"

echo "=========================================="
echo "TESTANDO ROTAS DE REVENDA"
echo "=========================================="

echo ""
echo "1. Testando GET /api/admin/revenda/plans..."
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.primecamp.cloud/api/admin/revenda/plans | jq '.' 2>/dev/null || \
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.primecamp.cloud/api/admin/revenda/plans

echo ""
echo ""
echo "2. Testando GET /api/admin/revenda/companies..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.primecamp.cloud/api/admin/revenda/companies?page=1&limit=10" | jq '.' 2>/dev/null || \
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.primecamp.cloud/api/admin/revenda/companies?page=1&limit=10"

echo ""
echo "=========================================="
echo "TESTE CONCLUÍDO!"
echo "=========================================="

