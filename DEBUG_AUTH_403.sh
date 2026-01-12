#!/bin/bash

echo "🔍 DEBUG: Verificando problema de autenticação 403"
echo "=================================================="
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Verificando logs de ERRO do backend..."
echo ""
pm2 logs primecamp-api --err --lines 50 --nostream | grep -i "auth\|jwt\|token\|403\|verify" | tail -30

echo ""
echo "2️⃣ Verificando se JWT_SECRET está configurado..."
cd server
if grep -q "JWT_SECRET" .env 2>/dev/null || grep -q "JWT_SECRET" ../.env 2>/dev/null; then
    echo "   ✅ JWT_SECRET encontrado no .env"
    SECRET_LENGTH=$(grep JWT_SECRET ../.env 2>/dev/null | cut -d'=' -f2 | wc -c || echo "0")
    echo "   Tamanho do secret: $SECRET_LENGTH caracteres"
else
    echo "   ❌ JWT_SECRET NÃO encontrado no .env"
fi

echo ""
echo "3️⃣ Testando endpoint /api/health..."
curl -s http://localhost:3000/api/health | head -3

echo ""
echo "4️⃣ Testando endpoint /api/auth/me sem token (deve dar 401)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/auth/me

echo ""
echo "5️⃣ Verificando se usuário existe no banco..."
echo "   (Você precisa executar manualmente no psql)"
echo "   SELECT id, email, company_id FROM users WHERE email = 'lojaprimecamp@gmail.com';"

echo ""
echo "✅ Debug concluído!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Veja os logs de erro acima"
echo "   2. Verifique se JWT_SECRET está configurado"
echo "   3. Se o problema persistir, limpe o localStorage do navegador e faça login novamente"
