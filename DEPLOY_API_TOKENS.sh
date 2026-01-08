#!/bin/bash

echo "🚀 DEPLOY - API TOKENS"
echo "======================"
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

echo "1. Atualizando código..."
git pull origin main || { echo "❌ Erro: git pull falhou"; exit 1; }

echo ""
echo "2. Criando tabelas de API Tokens no banco..."
psql -U postgres -d banco_gestao -f CRIAR_TABELAS_API_TOKENS.sql || {
    echo "⚠️  AVISO: Erro ao executar SQL. Verificando se tabelas já existem..."
    psql -U postgres -d banco_gestao -c "\dt api_tokens" || {
        echo "❌ ERRO: Tabela api_tokens não existe e não foi criada!"
        exit 1
    }
    echo "✅ Tabelas já existem ou foram criadas"
}

echo ""
echo "3. Verificando se tabelas foram criadas..."
psql -U postgres -d banco_gestao -c "\dt api*" || echo "⚠️  Não foi possível verificar tabelas"

echo ""
echo "4. Reiniciando API..."
pm2 restart primecamp-api || {
    echo "⚠️  AVISO: PM2 restart falhou, tentando start..."
    cd server
    pm2 start index.js --name primecamp-api || {
        echo "❌ ERRO: Não foi possível iniciar API"
        exit 1
    }
    cd ..
}

echo ""
echo "5. Aguardando API iniciar..."
sleep 3

echo ""
echo "6. Verificando logs da API..."
pm2 logs primecamp-api --lines 30 --nostream | grep -i "api\|token\|erro" || echo "⚠️  Nenhum log relevante encontrado"

echo ""
echo "7. Testando health check..."
curl -s http://localhost:3000/api/health > /dev/null && echo "✅ Health check OK" || echo "⚠️  Health check falhou"

echo ""
echo "✅ DEPLOY CONCLUÍDO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Verifique os logs: pm2 logs primecamp-api --lines 100"
echo "2. Procure por '✅ Tabelas de API inicializadas' nos logs"
echo "3. Se aparecer erro, execute manualmente:"
echo "   psql -U postgres -d banco_gestao -f CRIAR_TABELAS_API_TOKENS.sql"
echo "4. Teste criar um token na interface: https://primecamp.cloud/integracoes"
echo ""


