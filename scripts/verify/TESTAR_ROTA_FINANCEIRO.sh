#!/bin/bash

echo "🧪 TESTE DA ROTA /financeiro"
echo "============================"
echo ""

cd /root/primecamp-ofc

# Testar se o backend está respondendo
echo "1️⃣ Testando backend (health check)..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "  ✅ Backend está respondendo"
else
    echo "  ❌ Backend NÃO está respondendo!"
    echo "     Verifique: pm2 status"
    exit 1
fi

# Verificar se a rota da API do financeiro existe (requer autenticação, mas vamos tentar)
echo ""
echo "2️⃣ Verificando se a rota da API existe..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/financeiro/dashboard 2>/dev/null || echo "000")
if [ "$API_RESPONSE" = "401" ] || [ "$API_RESPONSE" = "403" ]; then
    echo "  ✅ Rota da API existe (retornou $API_RESPONSE - precisa autenticação)"
elif [ "$API_RESPONSE" = "404" ]; then
    echo "  ❌ Rota da API NÃO existe (404)"
else
    echo "  ⚠️  Resposta inesperada: $API_RESPONSE"
fi

# Verificar se o index.html está servindo corretamente
echo ""
echo "3️⃣ Testando se o index.html está sendo servido..."
HTML_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/index.html 2>/dev/null || echo "000")
if [ "$HTML_RESPONSE" = "200" ]; then
    echo "  ✅ index.html está sendo servido (200 OK)"
else
    echo "  ❌ index.html NÃO está sendo servido corretamente (código: $HTML_RESPONSE)"
fi

# Verificar se o bundle JS está acessível
echo ""
echo "4️⃣ Testando se o bundle JS está acessível..."
BUNDLE_FILE=$(sudo grep -o 'assets/index-[^"]*\.js' /var/www/html/index.html | head -1)
if [ -n "$BUNDLE_FILE" ]; then
    BUNDLE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/$BUNDLE_FILE" 2>/dev/null || echo "000")
    if [ "$BUNDLE_RESPONSE" = "200" ]; then
        echo "  ✅ Bundle JS está acessível: $BUNDLE_FILE"
    else
        echo "  ❌ Bundle JS NÃO está acessível (código: $BUNDLE_RESPONSE)"
    fi
else
    echo "  ❌ Não foi possível encontrar o bundle no index.html"
fi

# Verificar logs do PM2
echo ""
echo "5️⃣ Últimas linhas do log do backend (verificando erros)..."
pm2 logs primecamp-api --lines 10 --nostream 2>/dev/null | tail -10

echo ""
echo "✅ Teste concluído!"
echo ""
echo "💡 Se tudo estiver OK acima, o problema é:"
echo "   1. Permissões do usuário (verificar se tem 'relatorios.financeiro')"
echo "   2. Erro JavaScript no navegador (verificar console F12)"
echo "   3. Cache do navegador (já testou em modo anônimo?)"
