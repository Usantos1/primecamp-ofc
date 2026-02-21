#!/bin/bash

echo "🔍 VERIFICANDO BACKEND - Rotas Financeiro"
echo "=========================================="
echo ""

# Verificar se o PM2 está rodando
echo "1️⃣ Verificando PM2..."
pm2 status

echo ""
echo "2️⃣ Verificando logs do backend (últimas 30 linhas)..."
pm2 logs primecamp-api --lines 30 --nostream 2>/dev/null | tail -30

echo ""
echo "3️⃣ Testando rota da API (sem autenticação - deve retornar 401)..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/financeiro/dashboard 2>/dev/null || echo "000")
echo "  Código HTTP: $HTTP_CODE"
if [ "$HTTP_CODE" = "401" ]; then
    echo "  ✅ Rota existe e requer autenticação (correto)"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "  ⚠️  Rota existe mas retorna 403 (token inválido ou sem permissão)"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "  ❌ Rota NÃO existe (404)"
else
    echo "  ⚠️  Código inesperado: $HTTP_CODE"
fi

echo ""
echo "4️⃣ Verificando se o arquivo financeiro.js existe..."
if [ -f "server/routes/financeiro.js" ]; then
    echo "  ✅ Arquivo existe"
    echo "  📊 Tamanho: $(wc -l < server/routes/financeiro.js) linhas"
else
    echo "  ❌ Arquivo NÃO existe!"
fi

echo ""
echo "5️⃣ Verificando se a rota está registrada no index.js..."
if grep -q "financeiroRoutes" server/index.js; then
    echo "  ✅ Rota registrada no index.js"
    grep -n "financeiroRoutes\|/api/financeiro" server/index.js | head -5
else
    echo "  ❌ Rota NÃO registrada no index.js!"
fi

echo ""
echo "✅ Verificação concluída!"
