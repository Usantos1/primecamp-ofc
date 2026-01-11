#!/bin/bash

echo "🔍 VERIFICANDO ERROS DO BACKEND - Financeiro"
echo "============================================="
echo ""

echo "1️⃣ Verificando logs de erro do PM2 (últimas 50 linhas)..."
pm2 logs primecamp-api --err --lines 50 --nostream 2>/dev/null | tail -50

echo ""
echo ""
echo "2️⃣ Verificando logs gerais do PM2 (últimas 30 linhas)..."
pm2 logs primecamp-api --lines 30 --nostream 2>/dev/null | tail -30

echo ""
echo ""
echo "3️⃣ Testando endpoint /financeiro/dashboard diretamente..."
echo "   (Você precisa ter um token válido para isso funcionar)"
echo ""
echo "   Para testar manualmente:"
echo "   curl -H 'Authorization: Bearer SEU_TOKEN_AQUI' https://api.primecamp.cloud/api/financeiro/dashboard"

echo ""
echo "✅ Verificação concluída!"
echo ""
echo "💡 Dica: Se você vir erros de SQL, pode ser um problema com as queries."
echo "   Se você vir erros de 'column does not exist', pode faltar uma migração."
