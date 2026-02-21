#!/bin/bash

echo "🔍 TESTANDO ROTAS DE REVENDA"
echo "============================="
echo ""

# Obter token JWT (você precisa estar logado)
echo "1️⃣ Verificando se há token JWT válido..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"uander.admin@gmail.com","password":"SUA_SENHA"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "⚠️  Não foi possível obter token. Usando token manual..."
    echo "   Por favor, obtenha um token JWT válido manualmente"
    echo ""
    echo "   Para obter token, faça login no frontend e copie do localStorage:"
    echo "   localStorage.getItem('token')"
    echo ""
    read -p "Cole o token JWT aqui: " TOKEN
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Token não fornecido. Abortando."
    exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:20}..."
echo ""

# Testar rota de planos
echo "2️⃣ Testando rota /api/admin/revenda/plans..."
RESPONSE_PLANS=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/revenda/plans)

HTTP_CODE_PLANS=$(echo "$RESPONSE_PLANS" | grep "HTTP_CODE" | cut -d: -f2)
BODY_PLANS=$(echo "$RESPONSE_PLANS" | sed '/HTTP_CODE/d')

echo "   Status HTTP: $HTTP_CODE_PLANS"
if [ "$HTTP_CODE_PLANS" = "200" ]; then
    echo "   ✅ Rota de planos funcionando!"
    echo "$BODY_PLANS" | jq '.' 2>/dev/null || echo "$BODY_PLANS"
else
    echo "   ❌ Erro na rota de planos"
    echo "$BODY_PLANS"
fi
echo ""

# Testar rota de companies
echo "3️⃣ Testando rota /api/admin/revenda/companies..."
RESPONSE_COMPANIES=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/revenda/companies?page=1&limit=20")

HTTP_CODE_COMPANIES=$(echo "$RESPONSE_COMPANIES" | grep "HTTP_CODE" | cut -d: -f2)
BODY_COMPANIES=$(echo "$RESPONSE_COMPANIES" | sed '/HTTP_CODE/d')

echo "   Status HTTP: $HTTP_CODE_COMPANIES"
if [ "$HTTP_CODE_COMPANIES" = "200" ]; then
    echo "   ✅ Rota de companies funcionando!"
    echo "$BODY_COMPANIES" | jq '.' 2>/dev/null || echo "$BODY_COMPANIES"
else
    echo "   ❌ Erro na rota de companies"
    echo "$BODY_COMPANIES"
fi
echo ""

# Verificar logs do PM2
echo "4️⃣ Verificando logs do PM2..."
echo "   Últimas linhas relacionadas a revenda:"
pm2 logs primecamp-api --lines 100 --nostream | grep -i "revenda\|plans\|companies" | tail -20

echo ""
echo "✅ Teste concluído!"

