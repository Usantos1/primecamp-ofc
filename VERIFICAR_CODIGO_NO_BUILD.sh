#!/bin/bash

echo "🔍 VERIFICANDO SE CÓDIGO ESTÁ NO BUILD"
echo "======================================"
echo ""

cd /root/primecamp-ofc || { echo "Erro: Diretório não encontrado."; exit 1; }

echo "1️⃣ Fazendo build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi

echo ""
echo "2️⃣ Verificando se código novo está no build..."
if grep -q "APP SIDEBAR DEBUG" dist/assets/*.js 2>/dev/null; then
    echo "✅ Código novo ENCONTRADO no build!"
else
    echo "❌ Código novo NÃO encontrado no build!"
    echo "Verificando arquivos JS no dist..."
    ls -la dist/assets/*.js 2>/dev/null | head -5
fi

echo ""
echo "3️⃣ Verificando se isAdminCompany está no build..."
if grep -q "isAdminCompany" dist/assets/*.js 2>/dev/null; then
    echo "✅ isAdminCompany ENCONTRADO no build!"
else
    echo "❌ isAdminCompany NÃO encontrado no build!"
fi

echo ""
echo "4️⃣ Verificando se ADMIN_COMPANY_ID está no build..."
if grep -q "00000000-0000-0000-0000-000000000001" dist/assets/*.js 2>/dev/null; then
    echo "✅ ADMIN_COMPANY_ID ENCONTRADO no build!"
else
    echo "❌ ADMIN_COMPANY_ID NÃO encontrado no build!"
fi

echo ""
echo "✅ Verificação concluída!"
echo ""

