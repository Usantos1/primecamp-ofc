#!/bin/bash

echo "🔧 CORRIGINDO ROTA DE USUÁRIOS NO VPS"
echo "======================================"
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Atualizando código do repositório..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Erro ao atualizar o código. Abortando."
    exit 1
fi
echo "✅ Código atualizado"

echo ""
echo "2️⃣ Reiniciando servidor API..."
pm2 restart primecamp-api
if [ $? -ne 0 ]; then
    echo "❌ Erro ao reiniciar o servidor PM2."
    exit 1
fi
sleep 5
echo "✅ Servidor reiniciado"

echo ""
echo "3️⃣ Verificando status do PM2..."
pm2 status

echo ""
echo "4️⃣ Verificando logs recentes (últimas 30 linhas)..."
pm2 logs primecamp-api --lines 30 --nostream | grep -i "revenda\|users\|erro\|error" || echo "Nenhum log relevante encontrado"

echo ""
echo "✅ CORREÇÃO APLICADA!"
echo ""
echo "📋 Para ver logs em tempo real, execute:"
echo "   pm2 logs primecamp-api --lines 50 | grep -i 'revenda\|users\|erro'"
echo ""
echo "🔍 Para testar a rota de usuários diretamente, execute:"
echo "   curl -H 'Authorization: Bearer SEU_TOKEN_JWT' https://api.primecamp.cloud/api/admin/revenda/companies/00000000-0000-0000-0000-000000000001/users"

