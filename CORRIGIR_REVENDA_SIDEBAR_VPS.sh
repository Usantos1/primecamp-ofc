#!/bin/bash

echo "🔒 CORRIGIR VISIBILIDADE DE GESTÃO DE REVENDA NO SIDEBAR"
echo "========================================================="
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
echo "2️⃣ Reiniciando servidor API..."
pm2 restart primecamp-api
if [ $? -ne 0 ]; then
    echo "❌ Erro ao reiniciar PM2."
    exit 1
fi
sleep 3
echo "✅ Servidor API reiniciado."

echo ""
echo "3️⃣ Verificando status do PM2..."
pm2 status
echo ""

echo "4️⃣ Fazendo build do frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer build do frontend."
    exit 1
fi
echo "✅ Build concluído."

echo ""
echo "5️⃣ Copiando arquivos para o Nginx..."
sudo cp -r dist/* /var/www/primecamp.cloud/
if [ $? -ne 0 ]; then
    echo "❌ Erro ao copiar arquivos."
    exit 1
fi
echo "✅ Arquivos copiados."

echo ""
echo "6️⃣ Recarregando Nginx..."
sudo systemctl reload nginx
if [ $? -ne 0 ]; then
    echo "❌ Erro ao recarregar Nginx."
    exit 1
fi
echo "✅ Nginx recarregado."

echo ""
echo "🎉 CORREÇÃO APLICADA!"
echo ""
echo "📋 IMPORTANTE - LEIA COM ATENÇÃO:"
echo "=================================="
echo ""
echo "1. ⚠️  LIMPE O CACHE DO NAVEGADOR:"
echo "   - Pressione Ctrl+Shift+R (Windows/Linux)"
echo "   - Ou Ctrl+F5"
echo "   - Ou limpe o cache manualmente nas configurações do navegador"
echo ""
echo "2. 🔐 FAÇA LOGOUT E LOGIN NOVAMENTE:"
echo "   - Isso é ESSENCIAL para carregar o company_id no objeto user"
echo "   - O company_id só é carregado após novo login"
echo ""
echo "3. 🔍 VERIFIQUE O CONSOLE DO NAVEGADOR:"
echo "   - Abra o DevTools (F12)"
echo "   - Vá para a aba Console"
echo "   - Procure por: '[AppSidebar] Admin detectado'"
echo "   - Verifique se company_id está correto"
echo ""
echo "4. ✅ RESULTADO ESPERADO:"
echo "   - Usuários da 'Ativa CRM' NÃO devem ver 'Gestão de Revenda'"
echo "   - Apenas admins da empresa principal devem ver"
echo ""

