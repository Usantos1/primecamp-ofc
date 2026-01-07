#!/bin/bash

echo "🔍 DIAGNÓSTICO DA API"
echo "===================="
echo ""

echo "1️⃣ Verificando se a API está rodando..."
pm2 status
echo ""

echo "2️⃣ Verificando se a porta 3000 está em uso..."
netstat -tlnp | grep 3000 || echo "   Porta 3000 não está em uso"
echo ""

echo "3️⃣ Testando API localmente..."
curl -v http://localhost:3000/api/health 2>&1 | head -20
echo ""

echo "4️⃣ Testando API externamente..."
curl -v https://api.primecamp.cloud/api/health 2>&1 | head -20
echo ""

echo "5️⃣ Verificando logs recentes do PM2..."
pm2 logs primecamp-api --lines 30 --nostream | tail -30
echo ""

echo "6️⃣ Verificando configuração do Nginx..."
if [ -f /etc/nginx/sites-available/primecamp.cloud ]; then
    echo "   Arquivo de configuração encontrado:"
    grep -A 5 "api.primecamp.cloud" /etc/nginx/sites-available/primecamp.cloud || echo "   Não encontrou configuração para api.primecamp.cloud"
else
    echo "   Arquivo de configuração não encontrado"
fi
echo ""

echo "7️⃣ Testando CORS..."
curl -H "Origin: https://primecamp.cloud" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     https://api.primecamp.cloud/api/auth/login \
     -v 2>&1 | grep -i "access-control" || echo "   Nenhum header CORS encontrado"
echo ""

echo "8️⃣ Testando login (sem credenciais válidas, apenas para ver se a rota responde)..."
curl -X POST https://api.primecamp.cloud/api/auth/login \
     -H "Content-Type: application/json" \
     -H "Origin: https://primecamp.cloud" \
     -d '{"email":"test@test.com","password":"test"}' \
     -v 2>&1 | head -30
echo ""

echo "✅ Diagnóstico concluído!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Se a API não estiver respondendo, verifique os logs do PM2"
echo "2. Se o CORS não estiver funcionando, verifique a configuração do Nginx"
echo "3. Se a API estiver respondendo localmente mas não externamente, verifique o Nginx"
echo ""

