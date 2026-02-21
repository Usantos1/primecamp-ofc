#!/bin/bash
# Script para adicionar variáveis DB_* no .env

cd /root/primecamp-ofc

# Verificar se as variáveis já existem
if grep -q "^DB_HOST=" .env; then
    echo "⚠️  Variáveis DB_* já existem no .env"
    echo "Verificando..."
    grep "^DB_" .env
else
    echo "➕ Adicionando variáveis DB_* no .env..."
    
    # Adicionar variáveis (verificar se JWT_SECRET já existe)
    if ! grep -q "^JWT_SECRET=" .env; then
        echo "" >> .env
        echo "# PostgreSQL Database Configuration" >> .env
        echo "DB_HOST=72.62.106.76" >> .env
        echo "DB_NAME=banco_gestao" >> .env
        echo "DB_USER=postgres" >> .env
        echo "DB_PASSWORD=AndinhoSurf2015@" >> .env
        echo "DB_PORT=5432" >> .env
        echo "DB_SSL=false" >> .env
        echo "JWT_SECRET=seu_jwt_secret_aqui" >> .env
        
        echo "✅ Variáveis adicionadas!"
    else
        echo "⚠️  JWT_SECRET já existe, adicionando apenas DB_*..."
        echo "" >> .env
        echo "# PostgreSQL Database Configuration" >> .env
        echo "DB_HOST=72.62.106.76" >> .env
        echo "DB_NAME=banco_gestao" >> .env
        echo "DB_USER=postgres" >> .env
        echo "DB_PASSWORD=AndinhoSurf2015@" >> .env
        echo "DB_PORT=5432" >> .env
        echo "DB_SSL=false" >> .env
        echo "✅ Variáveis DB_* adicionadas!"
    fi
    
    echo ""
    echo "📋 Variáveis adicionadas:"
    grep "^DB_" .env
fi

echo ""
echo "⚠️  IMPORTANTE: Verifique se JWT_SECRET está correto!"
echo "   Execute: nano .env"
echo ""
echo "🚀 Próximo passo:"
echo "   cd server && node test-connection.js"

