#!/bin/bash

echo "🚀 DEPLOY COMPLETO DO FRONTEND NO VPS"
echo "======================================"
echo ""

cd /root/primecamp-ofc || { echo "Erro: Diretório /root/primecamp-ofc não encontrado."; exit 1; }

echo "1️⃣ Atualizando código do repositório..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Erro ao atualizar o código. Abortando."
    exit 1
fi
echo "✅ Código atualizado."

echo ""
echo "2️⃣ Fazendo build do frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer build do frontend."
    exit 1
fi
echo "✅ Build concluído."

echo ""
echo "3️⃣ Copiando arquivos para o Nginx..."
sudo cp -r dist/* /var/www/primecamp.cloud/
if [ $? -ne 0 ]; then
    echo "❌ Erro ao copiar arquivos."
    exit 1
fi
echo "✅ Arquivos copiados."

echo ""
echo "4️⃣ Recarregando Nginx..."
sudo systemctl reload nginx
if [ $? -ne 0 ]; then
    echo "❌ Erro ao recarregar Nginx."
    exit 1
fi
echo "✅ Nginx recarregado."

echo ""
echo "🎉 DEPLOY CONCLUÍDO!"
echo ""
echo "📋 IMPORTANTE:"
echo "1. Limpe o cache do navegador (Ctrl+Shift+R ou Ctrl+F5)"
echo "2. Faça LOGOUT e LOGIN novamente para carregar o company_id"
echo "3. Verifique o console do navegador para ver os logs de debug"
echo ""

