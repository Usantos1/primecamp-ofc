#!/bin/bash

echo "🔄 FORÇANDO RECARGA COMPLETA DO SERVIDOR"
echo "=========================================="
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Parando PM2 completamente..."
pm2 stop all
pm2 delete all
echo "✅ PM2 parado e removido"

echo ""
echo "2️⃣ Limpando cache do Node.js..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf server/node_modules/.cache 2>/dev/null || true
echo "✅ Cache limpo"

echo ""
echo "3️⃣ Atualizando código do repositório..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Erro ao atualizar o código. Abortando."
    exit 1
fi
echo "✅ Código atualizado"

echo ""
echo "4️⃣ Verificando se o arquivo está correto..."
if grep -q "u.updated_at" server/routes/reseller.js; then
    echo "❌ ERRO: Ainda há referência a u.updated_at no código!"
    echo "Verificando linha exata:"
    grep -n "u.updated_at" server/routes/reseller.js
    exit 1
else
    echo "✅ Código verificado - sem referências a u.updated_at"
fi

echo ""
echo "5️⃣ Iniciando servidor novamente..."
cd server
pm2 start index.js --name primecamp-api
if [ $? -ne 0 ]; then
    echo "❌ Erro ao iniciar o servidor PM2."
    exit 1
fi
sleep 8
echo "✅ Servidor iniciado"

echo ""
echo "6️⃣ Verificando status do PM2..."
pm2 status

echo ""
echo "7️⃣ Verificando logs recentes..."
pm2 logs primecamp-api --lines 20 --nostream | tail -20

echo ""
echo "✅ RECARGA COMPLETA CONCLUÍDA!"
echo ""
echo "📋 Para ver logs em tempo real, execute:"
echo "   pm2 logs primecamp-api --lines 50 | grep -i 'revenda\|users\|erro'"
echo ""
echo "🔍 Para testar a rota, execute:"
echo "   curl -H 'Authorization: Bearer SEU_TOKEN' https://api.primecamp.cloud/api/admin/revenda/companies/00000000-0000-0000-0000-000000000001/users"

