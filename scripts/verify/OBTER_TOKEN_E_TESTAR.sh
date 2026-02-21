#!/bin/bash

echo "=========================================="
echo "OBTER TOKEN E TESTAR ROTA DE REVENDA"
echo "=========================================="

# Substitua pelas suas credenciais
EMAIL="uander.admin@gmail.com"
PASSWORD="SUA_SENHA_AQUI"

echo ""
echo "1. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST https://api.primecamp.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

# Verificar se o login funcionou
if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "✅ Token obtido!"
    echo ""
    echo "2. Testando rota /api/admin/revenda/plans..."
    curl -s -H "Authorization: Bearer $TOKEN" \
      https://api.primecamp.cloud/api/admin/revenda/plans | jq '.' 2>/dev/null || \
    curl -s -H "Authorization: Bearer $TOKEN" \
      https://api.primecamp.cloud/api/admin/revenda/plans
else
    echo "❌ Erro no login:"
    echo "$LOGIN_RESPONSE"
    echo ""
    echo "Para obter o token manualmente:"
    echo "1. Faça login no navegador"
    echo "2. Abra o console (F12)"
    echo "3. Digite: localStorage.getItem('auth_token')"
fi

echo ""
echo "=========================================="

