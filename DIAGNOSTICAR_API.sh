#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DA API"
echo "================================"
echo ""

cd /root/primecamp-ofc/server || { echo "❌ Erro: Não foi possível entrar no diretório server"; exit 1; }

# 1. Verificar se API está rodando
echo "1. Status do PM2:"
pm2 status | grep primecamp-api
echo ""

# 2. Verificar logs recentes
echo "2. Últimas 30 linhas dos logs:"
pm2 logs primecamp-api --lines 30 --nostream
echo ""

# 3. Verificar porta 3000
echo "3. Processos na porta 3000:"
ss -tulpn | grep ":3000" || echo "   Nenhum processo encontrado na porta 3000"
echo ""

# 4. Verificar se node_modules existe
echo "4. Verificando dependências:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules existe"
    if [ -f "node_modules/express/package.json" ]; then
        echo "✅ express instalado"
    else
        echo "❌ express NÃO instalado!"
    fi
    if [ -f "node_modules/pg/package.json" ]; then
        echo "✅ pg instalado"
    else
        echo "❌ pg NÃO instalado!"
    fi
else
    echo "❌ node_modules NÃO existe!"
fi
echo ""

# 5. Verificar arquivo index.js
echo "5. Verificando index.js:"
if [ -f "index.js" ]; then
    echo "✅ index.js existe"
    if grep -q "app.listen" index.js; then
        echo "✅ app.listen encontrado"
        PORT=$(grep -o "PORT.*||.*[0-9]*" index.js | grep -o "[0-9]*" | head -1)
        echo "   Porta configurada: ${PORT:-3000}"
    else
        echo "❌ app.listen NÃO encontrado!"
    fi
else
    echo "❌ index.js NÃO existe!"
fi
echo ""

# 6. Tentar iniciar manualmente para ver erros
echo "6. Testando inicialização manual (primeiros 5 segundos):"
timeout 5 node index.js 2>&1 || echo "   (Processo terminou ou timeout)"
echo ""

# 7. Verificar variáveis de ambiente
echo "7. Variáveis de ambiente:"
echo "   PORT: ${PORT:-não definida}"
echo "   NODE_ENV: ${NODE_ENV:-não definida}"
if [ -f "../.env" ]; then
    echo "✅ .env existe"
    if grep -q "JWT_SECRET" ../.env; then
        echo "✅ JWT_SECRET definido no .env"
    else
        echo "⚠️  JWT_SECRET NÃO encontrado no .env"
    fi
else
    echo "⚠️  .env NÃO existe"
fi
echo ""

# 8. Verificar conexão com banco
echo "8. Testando conexão com PostgreSQL:"
if command -v psql &> /dev/null; then
    echo "   psql disponível"
else
    echo "   psql não disponível (normal se não estiver instalado)"
fi
echo ""

echo "================================"
echo "📋 PRÓXIMOS PASSOS:"
echo "================================"
echo "1. Se houver erros nos logs acima, corrija-os"
echo "2. Execute: pm2 delete primecamp-api"
echo "3. Execute: cd /root/primecamp-ofc/server && npm install"
echo "4. Execute: pm2 start index.js --name primecamp-api"
echo "5. Execute: pm2 logs primecamp-api --lines 50"
echo ""


