#!/bin/bash

echo "🚀 DEPLOY COMPLETO - BACKEND + FRONTEND"
echo "========================================"
echo ""

cd /root/primecamp-ofc || { echo "Erro: Diretório não encontrado."; exit 1; }

# 1. Atualizar código
echo "1️⃣ Atualizando código do repositório..."
git pull origin main
echo "✅ Código atualizado."

# 2. Reiniciar backend
echo ""
echo "2️⃣ Reiniciando backend..."
pm2 restart primecamp-api
sleep 3
pm2 status
echo "✅ Backend reiniciado."

# 3. Build do frontend
echo ""
echo "3️⃣ Fazendo build do frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi
echo "✅ Build concluído."

# 4. Deploy do frontend
echo ""
echo "4️⃣ Copiando arquivos para o Nginx..."
sudo rm -rf /var/www/primecamp.cloud/* 2>/dev/null || true
sudo cp -r dist/* /var/www/primecamp.cloud/
echo "✅ Arquivos copiados."

# 5. Reload Nginx
echo ""
echo "5️⃣ Recarregando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recarregado."

# 6. Verificar logs do backend
echo ""
echo "6️⃣ Verificando logs do backend (últimas 20 linhas)..."
pm2 logs primecamp-api --lines 20 --nostream 2>&1 | tail -25

echo ""
echo "🎉 DEPLOY COMPLETO FINALIZADO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "2. Faça logout e login novamente"
echo "3. Os erros de tasks/processes devem sumir"
echo ""
