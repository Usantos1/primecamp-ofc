#!/bin/bash
set -e

echo "🔥 DEPLOY FRONTEND COM LIMPEZA COMPLETA DE CACHE"
echo "================================================="
echo ""

cd /root/primecamp-ofc || {
    echo "❌ Erro: Diretório /root/primecamp-ofc não encontrado"
    exit 1
}

echo "1️⃣ Limpando builds e caches anteriores..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
echo "✅ Limpeza concluída."

echo ""
echo "2️⃣ Atualizando código do repositório..."
git pull origin main
echo "✅ Código atualizado."

echo ""
echo "3️⃣ Verificando se o código está correto..."
if grep -q "showAlreadyAppliedModal.*useState" src/pages/JobApplicationSteps.tsx; then
    echo "✅ Código correto encontrado (showAlreadyAppliedModal declarado)"
else
    echo "❌ ERRO: Código não encontrado! Verificando..."
    grep -n "showAlreadyAppliedModal" src/pages/JobApplicationSteps.tsx || echo "Estado não encontrado no arquivo!"
    exit 1
fi

echo ""
echo "4️⃣ Fazendo build do frontend (pode demorar alguns minutos)..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi
echo "✅ Build concluído."

echo ""
echo "5️⃣ Verificando se dist/ foi criado..."
if [ ! -d "dist" ]; then
    echo "❌ Erro: Diretório dist/ não foi criado!"
    exit 1
fi
echo "✅ Diretório dist/ existe."

echo ""
echo "6️⃣ Limpando diretório do Nginx..."
sudo rm -rf /var/www/primecamp.cloud/*
sudo rm -rf /var/www/primecamp.cloud/.* 2>/dev/null || true
echo "✅ Diretório limpo."

echo ""
echo "7️⃣ Copiando arquivos para o Nginx..."
sudo cp -r dist/* /var/www/primecamp.cloud/
echo "✅ Arquivos copiados."

echo ""
echo "8️⃣ Ajustando permissões..."
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
echo "✅ Permissões ajustadas."

echo ""
echo "9️⃣ Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx
echo "✅ Cache do Nginx limpo e serviço recarregado."

echo ""
echo "🎉 DEPLOY COMPLETO FINALIZADO!"
echo ""
echo "📋 PRÓXIMOS PASSOS NO NAVEGADOR:"
echo "1. Feche TODAS as abas do primecamp.cloud"
echo "2. Limpe o cache do navegador completamente (Ctrl+Shift+Delete)"
echo "3. Ou use modo anônimo/privado (Ctrl+Shift+N)"
echo "4. Acesse: https://primecamp.cloud/vaga/atendente-cs"
echo "5. O erro showAlreadyAppliedModal deve desaparecer"
echo ""
