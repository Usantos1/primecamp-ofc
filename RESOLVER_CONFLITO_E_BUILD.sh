#!/bin/bash
# Resolver conflito git e fazer build

echo "📦 Resolvendo conflitos git..."

# Descarta mudanças locais no DEPLOY_IA_FINANCEIRO.sh (vamos usar a versão do repositório)
cd /root/primecamp-ofc
git checkout -- DEPLOY_IA_FINANCEIRO.sh

# Faz pull novamente
git pull origin main

# Verifica se os arquivos foram atualizados
echo "✅ Verificando se os arquivos foram atualizados..."
grep -n "TODO: Implementar hooks" src/pages/admin/financeiro/FinanceiroDashboard.tsx || echo "⚠️  FinanceiroDashboard.tsx não foi atualizado"

# Faz build
echo "🏗️  Fazendo build..."
npm run build

echo "✅ Concluído!"
