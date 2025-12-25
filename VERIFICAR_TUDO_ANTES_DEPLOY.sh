#!/bin/bash

echo "🔍 VERIFICAÇÃO COMPLETA ANTES DO DEPLOY"
echo "========================================"
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

ERROS=0

# 1. Verificar código fonte
echo "1. Verificando código fonte..."
if [ ! -f "src/pages/TestAuth.tsx" ]; then
    echo "❌ ERRO: src/pages/TestAuth.tsx não existe!"
    ERROS=$((ERROS + 1))
else
    echo "✅ TestAuth.tsx existe"
fi

if ! grep -q "test-auth" src/App.tsx; then
    echo "❌ ERRO: Rota /test-auth não encontrada no App.tsx!"
    ERROS=$((ERROS + 1))
else
    echo "✅ Rota /test-auth encontrada no App.tsx"
fi

if ! grep -q "import TestAuth" src/App.tsx; then
    echo "❌ ERRO: Import de TestAuth não encontrado no App.tsx!"
    ERROS=$((ERROS + 1))
else
    echo "✅ Import de TestAuth encontrado"
fi

# 2. Verificar se API está rodando
echo ""
echo "2. Verificando se API está rodando..."
if pm2 list | grep -q "primecamp-api.*online"; then
    echo "✅ API está rodando no PM2"
    API_PID=$(pm2 jlist | grep -A 5 "primecamp-api" | grep "pid" | head -1 | grep -o '[0-9]*')
    echo "   PID: $API_PID"
else
    echo "❌ ERRO: API NÃO está rodando no PM2!"
    echo "   Execute: cd server && pm2 start index.js --name primecamp-api"
    ERROS=$((ERROS + 1))
fi

# 3. Verificar se porta 3000 está em uso
echo ""
echo "3. Verificando porta 3000..."
if ss -tulpn | grep -q ":3000"; then
    echo "✅ Porta 3000 está em uso"
    ss -tulpn | grep ":3000"
else
    echo "⚠️  AVISO: Porta 3000 não está em uso (API pode não estar rodando)"
fi

# 4. Testar endpoint da API
echo ""
echo "4. Testando endpoint /api/health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Endpoint /api/health está respondendo (200 OK)"
    curl -s http://localhost:3000/api/health | head -3
else
    echo "❌ ERRO: Endpoint /api/health retornou código $HEALTH_RESPONSE"
    echo "   Verifique se a API está rodando e se o endpoint existe"
    ERROS=$((ERROS + 1))
fi

# 5. Verificar código do servidor
echo ""
echo "5. Verificando código do servidor..."
if ! grep -q "app.get('/api/health'" server/index.js && ! grep -q 'app.get("/api/health"' server/index.js; then
    echo "⚠️  AVISO: Endpoint /api/health não encontrado no código do servidor"
    echo "   Mas pode estar funcionando se foi adicionado recentemente"
else
    echo "✅ Endpoint /api/health encontrado no código"
fi

# 6. Verificar build anterior
echo ""
echo "6. Verificando build anterior..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "✅ Build anterior existe"
    echo "   Data: $(stat -c %y dist/index.html | cut -d' ' -f1,2)"
else
    echo "⚠️  AVISO: Nenhum build anterior encontrado (normal se for primeira vez)"
fi

# 7. Verificar arquivos no servidor web
echo ""
echo "7. Verificando arquivos no servidor web..."
if [ -f "/var/www/html/index.html" ]; then
    echo "✅ /var/www/html/index.html existe"
    echo "   Data: $(stat -c %y /var/www/html/index.html | cut -d' ' -f1,2)"
    
    # Verificar se TestAuth está no bundle do servidor
    if grep -r "test-auth\|TestAuth" /var/www/html/assets/*.js > /dev/null 2>&1; then
        echo "✅ 'test-auth' encontrado nos arquivos do servidor"
    else
        echo "⚠️  AVISO: 'test-auth' NÃO encontrado nos arquivos do servidor (pode ser cache antigo)"
    fi
else
    echo "⚠️  AVISO: /var/www/html/index.html não existe"
fi

# 8. Verificar Nginx
echo ""
echo "8. Verificando Nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está rodando"
else
    echo "❌ ERRO: Nginx NÃO está rodando!"
    ERROS=$((ERROS + 1))
fi

# RESUMO
echo ""
echo "========================================"
echo "📊 RESUMO DA VERIFICAÇÃO:"
echo "========================================"

if [ $ERROS -eq 0 ]; then
    echo "✅ TUDO OK! Pode fazer deploy."
    echo ""
    echo "Para fazer deploy, execute:"
    echo "  ./DEPLOY_COMPLETO_VPS.sh"
    exit 0
else
    echo "❌ ENCONTRADOS $ERROS ERRO(S)!"
    echo ""
    echo "Corrija os erros acima antes de fazer deploy."
    exit 1
fi


