#!/bin/bash

echo "🚀 EXECUTAR TUDO - DEPLOY COMPLETO"
echo "==================================="
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

# Atualizar código
echo "1. Atualizando código..."
git pull origin main || { echo "❌ Erro: git pull falhou"; exit 1; }
echo "✅ Código atualizado"

# Dar permissão e executar script
echo ""
echo "2. Executando rebuild completo..."
chmod +x FORCAR_REBUILD_COMPLETO.sh
./FORCAR_REBUILD_COMPLETO.sh

echo ""
echo "✅ TUDO CONCLUÍDO!"
echo "Acesse: https://primecamp.cloud/test-auth"


