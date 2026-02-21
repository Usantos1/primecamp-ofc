#!/bin/bash
set -e

echo "🔄 ATUALIZANDO E REINICIANDO BACKEND"
echo "====================================="
echo ""

# 1. Ir para o diretório do projeto
cd /root/primecamp-ofc || {
    echo "❌ Erro: Diretório /root/primecamp-ofc não encontrado"
    exit 1
}

# 2. Atualizar código
echo "📥 Atualizando código..."
git pull origin main
echo "✅ Código atualizado"

# 3. Reiniciar backend
echo ""
echo "🔄 Reiniciando backend..."
cd server

# Verificar se PM2 está instalado
if command -v pm2 &> /dev/null; then
    # Verificar se processo existe
    if pm2 list | grep -q "primecamp-api"; then
        echo "   Reiniciando processo existente..."
        pm2 restart primecamp-api
    else
        echo "   Iniciando novo processo..."
        pm2 start index.js --name primecamp-api
    fi
    sleep 3
    echo "✅ Backend reiniciado"
    
    echo ""
    echo "📊 Status do PM2:"
    pm2 status
    
    echo ""
    echo "📋 Últimos logs:"
    pm2 logs primecamp-api --lines 15 --nostream | tail -15
else
    echo "❌ PM2 não encontrado. Execute: npm install -g pm2"
    exit 1
fi

echo ""
echo "✅ BACKEND ATUALIZADO E REINICIADO!"
echo ""
echo "💡 Teste a API:"
echo "   curl http://localhost:3000/api/health"
