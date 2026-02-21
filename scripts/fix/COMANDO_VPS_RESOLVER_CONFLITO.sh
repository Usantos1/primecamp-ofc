#!/bin/bash
# Script para resolver conflito Git e atualizar VPS

echo "🔧 Resolvendo conflito Git..."
cd /root/primecamp-ofc

echo "📦 Descartando alterações locais em server/index.js..."
git checkout -- server/index.js

echo "⬇️  Atualizando código do Git..."
git pull origin main

echo "✅ Código atualizado!"
echo ""
echo "⚠️  PRÓXIMO PASSO: Edite o arquivo .env:"
echo "   1. Remova todas as linhas VITE_DB_*"
echo "   2. Adicione as variáveis DB_*:"
echo ""
echo "   DB_HOST=72.62.106.76"
echo "   DB_NAME=banco_gestao"
echo "   DB_USER=postgres"
echo "   DB_PASSWORD=AndinhoSurf2015@"
echo "   DB_PORT=5432"
echo "   DB_SSL=false"
echo "   JWT_SECRET=seu_jwt_secret_aqui"
echo ""
echo "Execute: nano .env"

