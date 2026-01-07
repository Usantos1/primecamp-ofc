#!/bin/bash

echo "=========================================="
echo "TESTANDO ROTA DE REVENDA"
echo "=========================================="

# Primeiro, fazer login para obter um token válido
echo ""
echo "1. Fazendo login para obter token..."
LOGIN_RESPONSE=$(curl -s -X POST https://api.primecamp.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "uander.admin@gmail.com",
    "password": "SUA_SENHA_AQUI"
  }')

echo "Resposta do login:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extrair token (ajuste conforme a estrutura da resposta)
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // .data.session.access_token // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo ""
    echo "❌ Não foi possível obter o token. Verifique as credenciais."
    echo ""
    echo "Para testar manualmente:"
    echo "1. Faça login no navegador em https://primecamp.cloud"
    echo "2. Abra o console do navegador (F12)"
    echo "3. Digite: localStorage.getItem('auth_token')"
    echo "4. Copie o token e use no comando abaixo:"
    echo ""
    echo "curl -H \"Authorization: Bearer SEU_TOKEN_AQUI\" \\"
    echo "  https://api.primecamp.cloud/api/admin/revenda/plans"
    exit 1
fi

echo ""
echo "✅ Token obtido: ${TOKEN:0:50}..."
echo ""

# Testar rota de planos
echo "2. Testando rota /api/admin/revenda/plans..."
PLANS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.primecamp.cloud/api/admin/revenda/plans)

echo "Resposta:"
echo "$PLANS_RESPONSE" | jq '.' 2>/dev/null || echo "$PLANS_RESPONSE"

echo ""
echo "=========================================="
echo "TESTE CONCLUÍDO!"
echo "=========================================="

